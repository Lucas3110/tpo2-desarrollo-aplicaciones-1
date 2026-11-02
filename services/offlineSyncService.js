// Punto 6: capa de persistencia offline sobre WatermelonDB.
//
// Centraliza dos responsabilidades:
//   1. Caché de lectura (`publicaciones_cacheadas`): guarda las últimas
//      publicaciones consultadas y los últimos resultados de búsqueda para
//      responder cuando `apiClient` lanza `ErrorApi` con `.esDeConexion`.
//   2. Cola de escritura (`publicaciones_pendientes`): guarda las
//      publicaciones creadas sin internet (apoyándose en el borrador local)
//      y las envía automáticamente a `POST /hallado/publicaciones` apenas
//      vuelve la red.
import { Q } from '@nozbe/watermelondb';
import { database, tablaCacheadas, tablaPendientes } from '../database';
import apiClient from './apiClient';
import { TIMEOUT_FOTO_MS } from '../config/env';
import { hoyIso, isoATexto, isoDeHace } from '../utils/fechas';
import { borrarBorrador, guardarBorrador } from './borradorService';
import { borrarCopiasLocales } from './copiaLocal';

// Tope de publicaciones guardadas en el teléfono para no inflar la base
// indefinidamente. Se conservan siempre las más recientes.
const MAX_CACHEADAS = 50;

const UN_DIA_MS = 24 * 60 * 60 * 1000;
// El backend da 30 días de vigencia desde la creación (DIAS_VIGENCIA). Lo
// usamos para deducir cuándo se creó una publicación propia, porque el DTO de
// "mis publicaciones" no trae la fecha de creación.
const DIAS_VIGENCIA = 30;

// Estado de la cola que NO se reintenta: el backend rechazó la publicación
// con un error definitivo (400/422...). Queda guardada para que la persona
// vea el motivo y la descarte, pero la sincronización la ignora.
const ESTADO_ERROR = 'ERROR';

function asignarCamposCache(registro, publicacion, acciones, esUltimoResultado) {
  let previo = {};
  if (registro.datosJson) {
    try {
      previo = JSON.parse(registro.datosJson) ?? {};
    } catch {
      previo = {};
    }
  }

  // Si ya teníamos el detalle completo guardado y ahora entra el resumen
  // desde un listado de búsqueda, fusionamos para no perder `descripcion`,
  // `publicador` o `preguntaVerificacion`.
  const combinado = { ...previo, ...publicacion };

  registro.publicacionId = Number(combinado.id);
  registro.tipo = String(combinado.tipo ?? 'PERDI');
  registro.titulo = String(combinado.titulo ?? '');
  registro.descripcion = combinado.descripcion ?? previo.descripcion ?? null;
  registro.estado = String(combinado.estado ?? 'ABIERTA');
  registro.fechaSuceso = String(combinado.fechaSuceso ?? '');
  registro.franjaHoraria = String(combinado.franjaHoraria ?? 'NO_SE');
  registro.barrioNombre = String(combinado.barrio?.nombre ?? '');
  registro.categoriaNombre = String(combinado.categoria?.nombre ?? '');
  registro.fotosJson = JSON.stringify(combinado.fotos ?? []);
  registro.datosJson = JSON.stringify(combinado);
  if (acciones) {
    registro.accionesJson = JSON.stringify(acciones);
  }
  if (esUltimoResultado !== undefined) {
    registro.esUltimoResultado = Boolean(esUltimoResultado);
  }
  registro.consultadoEn = Date.now();
}

// Inserta o actualiza muchas publicaciones con UNA sola consulta de lectura y
// UN solo batch de escritura (antes: un SELECT por publicación y una
// transacción por cada una), y recorta la caché una única vez al final.
async function upsertPublicaciones(
  publicaciones,
  { acciones = null, esUltimoResultado, desmarcarAnteriores = false } = {}
) {
  const porId = new Map();
  for (const pub of publicaciones ?? []) {
    if (pub?.id) porId.set(Number(pub.id), pub);
  }
  if (porId.size === 0 && !desmarcarAnteriores) return;

  const ids = [...porId.keys()];

  await database.write(async () => {
    const existentes =
      ids.length > 0
        ? await tablaCacheadas.query(Q.where('publicacion_id', Q.oneOf(ids))).fetch()
        : [];
    const registroPorId = new Map(existentes.map((r) => [r.publicacionId, r]));
    const operaciones = [];

    if (desmarcarAnteriores) {
      const anteriores = await tablaCacheadas
        .query(Q.where('es_ultimo_resultado', true))
        .fetch();
      for (const ant of anteriores) {
        // Los que vuelven a entrar en este listado se actualizan abajo.
        if (registroPorId.has(ant.publicacionId)) continue;
        operaciones.push(
          ant.prepareUpdate((reg) => {
            reg.esUltimoResultado = false;
          })
        );
      }
    }

    for (const [id, pub] of porId) {
      const registro = registroPorId.get(id);
      if (registro) {
        operaciones.push(
          registro.prepareUpdate((reg) => {
            asignarCamposCache(reg, pub, acciones, esUltimoResultado);
          })
        );
      } else {
        operaciones.push(
          tablaCacheadas.prepareCreate((reg) => {
            asignarCamposCache(reg, pub, acciones, esUltimoResultado ?? false);
          })
        );
      }
    }

    if (operaciones.length > 0) await database.batch(...operaciones);
  });

  await recortarCacheAntigua();
}

// Guarda o actualiza una publicación individual (por ejemplo al abrir
// DetallePublicacionScreen o al crearla con éxito).
export async function guardarPublicacionEnCache(
  publicacion,
  acciones = null,
  { esUltimoResultado } = {}
) {
  if (!publicacion?.id) return;

  try {
    await upsertPublicaciones([publicacion], { acciones, esUltimoResultado });
  } catch (error) {
    if (__DEV__) {
      console.warn('[Offline] No se pudo guardar la publicación en caché:', error);
    }
  }
}

// Guarda varias publicaciones juntas (páginas 2+ de la búsqueda).
export async function guardarPublicacionesEnCache(publicaciones = []) {
  try {
    await upsertPublicaciones(publicaciones);
  } catch (error) {
    if (__DEV__) {
      console.warn('[Offline] No se pudieron guardar las publicaciones en caché:', error);
    }
  }
}

// Reemplaza la marca `es_ultimo_resultado` con las publicaciones del último
// listado buscado exitosamente en el punto 3.
export async function guardarResultadosBusquedaEnCache(publicaciones = []) {
  try {
    await upsertPublicaciones(publicaciones, {
      esUltimoResultado: true,
      desmarcarAnteriores: true,
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[Offline] No se pudieron cachear los resultados de búsqueda:', error);
    }
  }
}

async function recortarCacheAntigua() {
  try {
    // Solo traemos lo que sobra (desde la posición MAX_CACHEADAS en adelante),
    // no la tabla entera.
    const sobrantes = await tablaCacheadas
      .query(Q.sortBy('consultado_en', Q.desc), Q.skip(MAX_CACHEADAS), Q.take(1000))
      .fetch();

    if (sobrantes.length === 0) return;

    await database.write(async () => {
      await database.batch(...sobrantes.map((item) => item.prepareDestroyPermanently()));
    });
  } catch {
    // Si falla la limpieza no afecta la experiencia de la persona.
  }
}

// Borra toda la caché de lectura. Se llama al cerrar sesión: la caché guarda
// datos propios de quien navegó (`acciones`: si es el publicador, si puede
// reclamar...) y no tiene que verlos la próxima persona que use el teléfono.
// La cola de pendientes NO se toca: ya está separada por `usuario_id` y es
// trabajo de la persona que todavía no se envió.
export async function limpiarCacheLectura() {
  // También las copias de Mis reclamos / Mis alertas / Seguidas (AsyncStorage).
  await borrarCopiasLocales();
  try {
    await database.write(async () => {
      const todas = await tablaCacheadas.query().fetch();
      if (todas.length > 0) {
        await database.batch(...todas.map((item) => item.prepareDestroyPermanently()));
      }
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[Offline] No se pudo limpiar la caché de lectura:', error);
    }
  }
}

// Acciones de respaldo cuando una publicación se guardó desde un listado de
// búsqueda y todavía no tenía el objeto `acciones` del detalle.
function accionesPorDefecto(publicacion) {
  return {
    esPublicador: false,
    puedeReclamar: false,
    reclamo: publicacion?.tipo === 'ENCONTRE' ? 'ES_MIO' : 'LO_ENCONTRE',
    puedeSeguir: false,
  };
}

// Lee una publicación por su ID del backend desde WatermelonDB.
export async function leerPublicacionDeCache(id) {
  try {
    const numId = Number(id);
    if (!Number.isFinite(numId)) return null;

    const encontrados = await tablaCacheadas
      .query(Q.where('publicacion_id', numId))
      .fetch();

    if (encontrados.length === 0) return null;

    const registro = encontrados[0];
    const publicacion = registro.aDtoPublicacion();

    // Aseguramos estructura mínima para que DetallePublicacionScreen nunca
    // falle aunque la publicación haya entrado originalmente desde el listado.
    const normalizada = {
      ...publicacion,
      fotos: Array.isArray(publicacion.fotos) ? publicacion.fotos : registro.fotos,
      barrio: publicacion.barrio ?? { nombre: registro.barrioNombre },
      categoria: publicacion.categoria ?? { nombre: registro.categoriaNombre },
      publicador: publicacion.publicador ?? {
        id: 0,
        nombre: 'Vecino de Hallado',
        fotoUrl: null,
        miembroDesde: null,
        reputacion: { devoluciones: 0, recuperos: 0 },
      },
    };

    return {
      publicacion: normalizada,
      acciones: registro.acciones ?? accionesPorDefecto(normalizada),
      desdeCache: true,
    };
  } catch (error) {
    if (__DEV__) {
      console.warn('[Offline] Error al leer publicación de caché:', error);
    }
    return null;
  }
}

// Normaliza para comparar texto: minúsculas y sin acentos.
function normalizarTexto(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Decide si una publicación cacheada cumple los criterios del buscador. Imita
// lo que hace el backend con lo que se puede saber sin red: no puede ordenar
// por cercanía ni saber qué hay publicado que nunca se descargó.
function cumpleCriterios(pub, criterios) {
  // `queTePaso` es lo que le pasó a la persona; se ve el tipo OPUESTO.
  if (criterios.queTePaso) {
    const tipoBuscado = criterios.queTePaso === 'PERDI' ? 'ENCONTRE' : 'PERDI';
    if (pub.tipo !== tipoBuscado) return false;
  }
  // El backend sólo lista las abiertas.
  if (pub.estado && pub.estado !== 'ABIERTA') return false;
  if (criterios.categoriaId && Number(pub.categoria?.id) !== Number(criterios.categoriaId)) {
    return false;
  }
  if (criterios.barrioId && Number(pub.barrio?.id) !== Number(criterios.barrioId)) {
    return false;
  }
  if (criterios.q) {
    const palabras = normalizarTexto(criterios.q).split(/\s+/).filter(Boolean);
    const texto = normalizarTexto(`${pub.titulo} ${pub.descripcion ?? ''}`);
    if (!palabras.every((palabra) => texto.includes(palabra))) return false;
  }

  // Las fechas son 'AAAA-MM-DD', se comparan como texto.
  const fecha = pub.fechaSuceso;
  let desde = criterios.desde;
  let hasta = criterios.hasta;
  if (criterios.cuando === 'HOY') desde = hoyIso();
  else if (criterios.cuando === 'TRES_DIAS') desde = isoDeHace(3);
  else if (criterios.cuando === 'SEMANA') desde = isoDeHace(7);
  if (desde && (!fecha || fecha < desde)) return false;
  if (hasta && (!fecha || fecha > hasta)) return false;
  return true;
}

// Devuelve los resultados que se pueden armar sin conexión: se filtra TODO lo
// que hay en la caché con los criterios pedidos. Antes devolvía siempre la
// última búsqueda online y mostraba resultados que no coincidían con el filtro.
export async function leerUltimosResultadosDeCache(criterios = {}) {
  try {
    const registros = await tablaCacheadas
      .query(Q.sortBy('consultado_en', Q.desc))
      .fetch();

    const publicaciones = registros
      .map((r) => r.aDtoPublicacion())
      .filter((pub) => cumpleCriterios(pub, criterios))
      // Más reciente primero, como RECIENTES. CERCANOS no se puede sin red.
      .sort((a, b) => String(b.fechaSuceso ?? '').localeCompare(String(a.fechaSuceso ?? '')));

    return {
      publicaciones,
      paginado: {
        pagina: 1,
        limite: Math.max(publicaciones.length, 10),
        total: publicaciones.length,
        hayMas: false,
      },
      desdeCache: true,
    };
  } catch (error) {
    if (__DEV__) {
      console.warn('[Offline] Error al leer resultados de caché:', error);
    }
    return {
      publicaciones: [],
      paginado: { pagina: 1, limite: 10, total: 0, hayMas: false },
      desdeCache: true,
    };
  }
}

// ---------------------------------------------------------------
// Cola de escritura: `publicaciones_pendientes`
// ---------------------------------------------------------------

// `posibleEnvio`: el pedido llegó a salir y se cortó antes de la respuesta
// (el servidor pudo haber creado la publicación). Se anota en el payload con
// `_intentoPostEn` para que la sincronización lo verifique antes de reenviar.
// Es un campo interno: nunca viaja al backend.
export async function encolarPublicacionPendiente(
  usuarioId,
  datos,
  { barrioNombre = null, categoriaNombre = null, posibleEnvio = false } = {}
) {
  let creado = null;

  const payload = posibleEnvio ? { ...datos, _intentoPostEn: Date.now() } : datos;

  await database.write(async () => {
    creado = await tablaPendientes.create((reg) => {
      reg.usuarioId = Number(usuarioId ?? 0);
      reg.tipo = String(datos.tipo);
      reg.titulo = String(datos.titulo ?? '').trim();
      reg.barrioNombre = barrioNombre ?? 'Barrio seleccionado';
      reg.categoriaNombre = categoriaNombre ?? 'Categoría';
      reg.payloadJson = JSON.stringify(payload);
      reg.estadoEnvio = 'PENDIENTE';
      reg.ultimoError = null;
      reg.creadoEn = Date.now();
    });
  });

  // Una vez encolada en WatermelonDB ya no es un borrador a medio cargar,
  // así que limpiamos borradorService para que no vuelva a ofrecer retomarlo.
  if (usuarioId) {
    await borrarBorrador(usuarioId);
  }

  return aDtoPendiente(creado);
}

export function aDtoPendiente(registro) {
  const payload = registro.payload ?? {};
  const fotos = Array.isArray(payload.fotos) ? payload.fotos : [];
  const conError = registro.estadoEnvio === ESTADO_ERROR;

  return {
    id: `pendiente-${registro.id}`,
    // Id real de la fila en WatermelonDB, para poder descartarla.
    pendienteId: registro.id,
    esPendiente: true,
    pendienteDeEnvio: true,
    tipo: registro.tipo,
    titulo: registro.titulo,
    descripcion: payload.descripcion ?? null,
    estado: conError ? 'ERROR_ENVIO' : 'PENDIENTE_ENVIO',
    estadoEnvio: registro.estadoEnvio,
    ultimoError: registro.ultimoError,
    fechaSuceso: payload.fechaSuceso,
    franjaHoraria: payload.franjaHoraria ?? 'NO_SE',
    barrio: {
      id: payload.barrioId ?? null,
      nombre: registro.barrioNombre || 'Barrio seleccionado',
    },
    categoria: {
      id: payload.categoriaId ?? null,
      nombre: registro.categoriaNombre || 'Categoría',
    },
    portada: fotos[0] ?? null,
    fotos: fotos.map((url, idx) => ({ id: idx + 1, url })),
    venceEn: null,
    diasParaVencer: 30,
    puedeRenovarse: false,
  };
}

// Cuenta las que todavía se van a intentar enviar. Las rechazadas con error
// definitivo (`ERROR`) no cuentan: si contaran, NetworkContext seguiría
// reintentando cada 8 segundos para siempre.
export async function contarPublicacionesPendientes(usuarioId) {
  if (!usuarioId) return 0;
  try {
    return await tablaPendientes
      .query(
        Q.where('usuario_id', Number(usuarioId)),
        Q.where('estado_envio', Q.notEq(ESTADO_ERROR))
      )
      .fetchCount();
  } catch {
    return 0;
  }
}

// Lista todas (incluidas las rechazadas, para poder mostrar el motivo).
export async function listarPublicacionesPendientes(usuarioId) {
  if (!usuarioId) return [];
  try {
    const pendientes = await tablaPendientes
      .query(
        Q.where('usuario_id', Number(usuarioId)),
        Q.sortBy('creado_en', Q.desc)
      )
      .fetch();
    return pendientes.map(aDtoPendiente);
  } catch {
    return [];
  }
}

// Elimina una publicación de la cola (la persona la descarta, típicamente
// una que el backend rechazó).
export async function descartarPublicacionPendiente(pendienteId) {
  try {
    const registro = await tablaPendientes.find(pendienteId);
    await database.write(async () => {
      await registro.destroyPermanently();
    });
  } catch {
    // Si ya no existe, el resultado es el mismo que queríamos.
  }
}

// En qué paso del asistente conviene abrir una publicación rechazada: el que
// tiene el dato que el servidor objetó. Pasos: 0 tipo, 1 fotos, 2 qué es,
// 3 cuándo, 4 dónde, 5 verificación (solo ENCONTRE).
function pasoDelError(mensaje, tipo) {
  const texto = String(mensaje ?? '').toLowerCase();
  if (/fecha/.test(texto)) return 3;
  if (/barrio|latitud|longitud|direcci/.test(texto)) return 4;
  if (/foto/.test(texto)) return 1;
  if (tipo === 'ENCONTRE' && /pregunta|respuesta/.test(texto)) return 5;
  return 2;
}

// "Editar" una publicación que el servidor rechazó: la pasa a borrador (que el
// asistente de Publicar sabe retomar) y la saca de la cola. Se saca porque si
// quedara en la cola con el mismo error, o se reintentaría igual o quedaría
// duplicada cuando la persona la vuelva a mandar corregida.
//
// Devuelve true si pudo convertirla; false si ya no existía.
export async function convertirPendienteEnBorrador(pendienteId, usuarioId) {
  let registro;
  try {
    registro = await tablaPendientes.find(pendienteId);
  } catch {
    return false;
  }

  const p = registro.payload ?? {};
  const tipo = p.tipo ?? registro.tipo;
  const fechaIso = p.fechaSuceso ? String(p.fechaSuceso).slice(0, 10) : hoyIso();

  await guardarBorrador(usuarioId, {
    tipo,
    fotos: Array.isArray(p.fotos) ? p.fotos : [],
    categoriaId: p.categoriaId ?? null,
    titulo: p.titulo ?? registro.titulo ?? '',
    descripcion: p.descripcion ?? '',
    fechaTexto: isoATexto(fechaIso),
    franja: p.franjaHoraria ?? 'NO_SE',
    barrioId: p.barrioId ?? null,
    direccion: p.direccion ?? '',
    coordenadas:
      typeof p.lat === 'number' && typeof p.lng === 'number' ? { lat: p.lat, lng: p.lng } : null,
    pregunta: p.preguntaVerificacion ?? '',
    respuesta: p.respuestaVerificacion ?? '',
    paso: pasoDelError(registro.ultimoError, tipo),
  });

  await descartarPublicacionPendiente(pendienteId);
  return true;
}

// ---------------------------------------------------------------
// Sincronización
// ---------------------------------------------------------------

function errorPermanente(mensaje) {
  return Object.assign(new Error(mensaje), { permanente: true });
}

// 4xx = el backend leyó el pedido y lo rechazó: reintentar lo mismo da lo
// mismo. Se excluyen 401 (sesión: la maneja apiClient), 408 y 429 (transitorios).
function esRechazoPermanente(error) {
  const estado = Number(error?.estado);
  return (
    Number.isFinite(estado) &&
    estado >= 400 &&
    estado < 500 &&
    ![401, 408, 429].includes(estado)
  );
}

const ES_FOTO_LOCAL = /^(data:|file:|content:)/i;

// Los pedidos de la sincronización van marcados: si fallan, apiClient no pasa
// toda la app a "sin servidor" (ver `sinAvisoDeConexion` en apiClient.js).
const CONFIG_SEGUNDO_PLANO = { sinAvisoDeConexion: true };

// Cuántas publicaciones seguidas pueden fallar por conexión antes de cortar el
// lote. Una sola puede ser un problema de ESA publicación (una foto grande que
// no llega a subirse); dos seguidas ya indican que el servidor no responde.
const FALLOS_SEGUIDOS_PARA_CORTAR = 2;

// Lee un archivo local (file:// o content://) como base64 sin dependencias
// extra: fetch + FileReader funcionan con URIs locales en React Native.
async function leerArchivoLocal(uri) {
  const respuesta = await fetch(uri);
  const blob = await respuesta.blob();
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(lector.error ?? new Error('No se pudo leer el archivo'));
    lector.onloadend = () => {
      const resultado = String(lector.result ?? '');
      const corte = resultado.indexOf('base64,');
      if (corte < 0) {
        reject(new Error('Archivo vacío'));
        return;
      }
      resolve({ base64: resultado.slice(corte + 7), mime: blob.type || 'image/jpeg' });
    };
    lector.readAsDataURL(blob);
  });
}

// Sube UNA foto local y devuelve la URL relativa del backend (/uploads/x.jpg).
async function subirFotoLocal(referencia) {
  let base64;
  let mime;

  if (referencia.startsWith('data:')) {
    // Formato viejo (borradores de versiones anteriores): data URI inline.
    // No usamos regex sobre el string completo: puede pesar varios MB.
    const corte = referencia.indexOf('base64,');
    if (corte < 0) throw errorPermanente('Una de las fotos guardadas está dañada.');
    mime = referencia.slice(5, referencia.indexOf(';')) || 'image/jpeg';
    base64 = referencia.slice(corte + 7);
  } else {
    try {
      ({ base64, mime } = await leerArchivoLocal(referencia));
    } catch {
      throw errorPermanente(
        'No se pudo leer una de las fotos guardadas en el teléfono (el archivo ya no existe).'
      );
    }
  }

  const { data } = await apiClient.post(
    '/hallado/fotos',
    { base64, mime },
    { timeout: TIMEOUT_FOTO_MS, ...CONFIG_SEGUNDO_PLANO }
  );
  return data.url;
}

async function actualizarPendiente(item, cambios) {
  await database.write(async () => {
    await item.update((reg) => {
      if (cambios.estadoEnvio !== undefined) reg.estadoEnvio = cambios.estadoEnvio;
      if (cambios.ultimoError !== undefined) reg.ultimoError = cambios.ultimoError;
      if (cambios.payload !== undefined) reg.payloadJson = JSON.stringify(cambios.payload);
    });
  });
}

// Sube las fotos locales y reemplaza cada una por su URL del backend. Cada
// subida se persiste en el payload: si el POST posterior falla y se reintenta,
// no se vuelven a subir (ni quedan archivos huérfanos en el servidor).
// Si una foto no se puede resolver, tira un error: NUNCA se descarta en
// silencio para publicar igual sin ella.
async function resolverFotosPendientes(item, payload) {
  const fotos = Array.isArray(payload.fotos) ? [...payload.fotos] : [];
  let actual = payload;

  for (let i = 0; i < fotos.length; i += 1) {
    const foto = fotos[i];
    if (typeof foto !== 'string') {
      throw errorPermanente('Una de las fotos de la publicación no es válida.');
    }
    if (!ES_FOTO_LOCAL.test(foto)) continue;

    fotos[i] = await subirFotoLocal(foto);
    actual = { ...actual, fotos: [...fotos] };
    await actualizarPendiente(item, { payload: actual });
  }

  return actual;
}

// ¿Ya existe en el servidor una publicación mía que coincide con esta? Solo
// se consulta si un intento anterior pudo haber llegado al servidor sin que
// nos enterásemos (respuesta perdida). El DTO no trae fecha de creación, así
// que se deduce de `venceEn` (creación + 30 días).
async function yaExisteEnServidor(payload) {
  const { data } = await apiClient.get('/hallado/publicaciones/mias', CONFIG_SEGUNDO_PLANO);
  const desde = Number(payload._intentoPostEn) - UN_DIA_MS;

  return (data.publicaciones ?? []).some((p) => {
    const vence = new Date(p.venceEn).getTime();
    const creadaAprox = vence - DIAS_VIGENCIA * UN_DIA_MS;
    return (
      p.tipo === payload.tipo &&
      String(p.titulo).trim() === String(payload.titulo ?? '').trim() &&
      Number(p.categoria?.id) === Number(payload.categoriaId) &&
      Number(p.barrio?.id) === Number(payload.barrioId) &&
      Number.isFinite(creadaAprox) &&
      creadaAprox >= desde
    );
  });
}

async function eliminarPendiente(item) {
  await database.write(async () => {
    await item.destroyPermanently();
  });
}

// Procesa en orden todas las publicaciones pendientes del usuario activo.
// La invoca NetworkContext automáticamente cuando vuelve la conexión.
//
// Resultado de cada ítem:
//   - Éxito              -> se borra de la cola.
//   - Sin conexión / 5xx -> vuelve a PENDIENTE y se corta el lote (se reintenta).
//   - Rechazo 4xx        -> queda en ERROR para siempre (no se reintenta).
//   - Respuesta perdida  -> el payload conserva `_intentoPostEn` y el próximo
//                           intento verifica en el servidor antes de reenviar.
export async function sincronizarPublicacionesPendientes(usuarioId) {
  if (!usuarioId) return { enviadas: 0, fallidas: 0 };

  let enviadas = 0;
  let fallidas = 0;
  let fallosSeguidos = 0;

  try {
    // Todo menos las rechazadas. Esto incluye filas que quedaron en 'ENVIANDO'
    // si la app se cerró en medio de un envío.
    const pendientes = await tablaPendientes
      .query(
        Q.where('usuario_id', Number(usuarioId)),
        Q.where('estado_envio', Q.notEq(ESTADO_ERROR)),
        Q.sortBy('creado_en', Q.asc)
      )
      .fetch();

    for (const item of pendientes) {
      let payload = item.payload;
      if (!payload) {
        await eliminarPendiente(item);
        continue;
      }

      try {
        await actualizarPendiente(item, { estadoEnvio: 'ENVIANDO', ultimoError: null });

        // Un intento anterior pudo haber llegado al servidor: verificamos antes
        // de crear un duplicado.
        if (payload._intentoPostEn && (await yaExisteEnServidor(payload))) {
          await eliminarPendiente(item);
          enviadas += 1;
          fallosSeguidos = 0;
          continue;
        }

        payload = await resolverFotosPendientes(item, payload);

        // Anotamos el intento ANTES del POST, así sobrevive aunque la app muera
        // o se pierda la respuesta. `_intentoPostEn` es interno: no se envía.
        const { _intentoPostEn, ...cuerpoPost } = payload;
        await actualizarPendiente(item, {
          payload: { ...cuerpoPost, _intentoPostEn: Date.now() },
        });

        const { data } = await apiClient.post(
          '/hallado/publicaciones',
          cuerpoPost,
          CONFIG_SEGUNDO_PLANO
        );

        if (data?.publicacion) {
          await guardarPublicacionEnCache(data.publicacion);
        }

        await eliminarPendiente(item);
        enviadas += 1;
        fallosSeguidos = 0;
      } catch (error) {
        fallidas += 1;

        const permanente = Boolean(error.permanente) || esRechazoPermanente(error);

        const cambios = {
          estadoEnvio: permanente ? ESTADO_ERROR : 'PENDIENTE',
          ultimoError: error.message ?? 'No se pudo enviar',
        };

        // Si el servidor contestó (cualquier status), sabemos que NO se creó:
        // limpiamos la marca para no verificar de más. Si no hubo respuesta,
        // la marca queda y el próximo intento verifica.
        // (La marca pudo escribirse justo antes del POST, así que se limpia
        // siempre que haya respuesta, no solo si la variable local la tiene.)
        if (Number(error.estado) > 0) {
          const { _intentoPostEn, ...sinMarca } = payload;
          cambios.payload = sinMarca;
        }

        await actualizarPendiente(item, cambios);

        // Qué hacer con las demás publicaciones de la cola:
        // - Sesión vencida o teléfono sin red: nada va a funcionar, se corta.
        // - Fallo de conexión con el servidor o un 5xx: puede ser un problema
        //   de ESTA publicación (por ejemplo una foto grande), así que se sigue
        //   con las demás y no quedan trabadas detrás. Si fallan dos seguidas
        //   es que el servidor no responde y se corta hasta el próximo ciclo.
        if (error.estado === 401 || error.causa === 'SIN_RED') break;
        if (error.esDeConexion || Number(error.estado) >= 500) {
          fallosSeguidos += 1;
          if (fallosSeguidos >= FALLOS_SEGUIDOS_PARA_CORTAR) break;
        } else {
          fallosSeguidos = 0;
        }
      }
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[Offline] Error al sincronizar publicaciones pendientes:', error);
    }
  }

  return { enviadas, fallidas };
}
