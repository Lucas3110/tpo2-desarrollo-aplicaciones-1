// Punto 5 y Punto 6: todo lo que la app le pide al backend sobre
// publicaciones, con respaldo local (AsyncStorage) cuando no hay conexión.
//
// JavaScript puro, sin JSX. Todas las peticiones salen por apiClient, que es
// el único cliente con interceptores.
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './apiClient';
import { BASE_URL } from '../config/env';
import {
  encolarPublicacionPendiente,
  guardarPublicacionEnCache,
  guardarPublicacionesEnCache,
  guardarResultadosBusquedaEnCache,
  leerPublicacionDeCache,
  leerUltimosResultadosDeCache,
  listarPublicacionesPendientes,
  descartarPublicacionPendiente,
  convertirPendienteEnBorrador,
} from './offlineSyncService';

const CLAVE_CATEGORIAS = 'hallado.cache.categorias';
const CLAVE_BARRIOS = 'hallado.cache.barrios';

function parsearLista(texto) {
  if (!texto) return null;
  try {
    const lista = JSON.parse(texto);
    return Array.isArray(lista) && lista.length > 0 ? lista : null;
  } catch {
    return null;
  }
}

// GET /hallado/categorias
// Documentos, Llaves, Electronica, Mascotas, Ropa, Otros.
//
// Punto 6: NO hay lista inventada de respaldo. Los ids tienen que ser los del
// servidor (van en el POST de la publicación), así que sin conexión se usa la
// última copia real guardada en AsyncStorage (NetworkContext la precarga apenas
// hay sesión y red). Si nunca se pudo bajar, se relanza el error de conexión y
// la pantalla pide conectarse.
export async function obtenerCategorias() {
  try {
    const { data } = await apiClient.get('/hallado/categorias');
    await AsyncStorage.setItem(CLAVE_CATEGORIAS, JSON.stringify(data.categorias)).catch(() => {});
    return data.categorias;
  } catch (e) {
    if (e.esDeConexion) {
      const guardado = await AsyncStorage.getItem(CLAVE_CATEGORIAS).catch(() => null);
      const lista = parsearLista(guardado);
      if (lista) return lista;
    }
    throw e;
  }
}

// GET /hallado/barrios
// Por detrás son las zonas que ya usaba la entrega anterior, pero el backend
// las expone con el nombre que usa el enunciado nuevo.
export async function obtenerBarrios() {
  try {
    const { data } = await apiClient.get('/hallado/barrios');
    await AsyncStorage.setItem(CLAVE_BARRIOS, JSON.stringify(data.barrios)).catch(() => {});
    return data.barrios;
  } catch (e) {
    if (e.esDeConexion) {
      const guardado = await AsyncStorage.getItem(CLAVE_BARRIOS).catch(() => null);
      const lista = parsearLista(guardado);
      if (lista) return lista;
    }
    throw e;
  }
}

// POST /hallado/publicaciones
//
// Espera el objeto tal cual lo arma el wizard. La pregunta y la respuesta de
// verificación sólo van en las de tipo ENCONTRE: el backend rechaza una
// pérdida que las traiga.
//
// Punto 6: si falla por falta de red (`e.esDeConexion`), guarda la
// publicación en la cola de pendientes (AsyncStorage) para
// que `NetworkContext` la envíe sola apenas vuelva internet.
export async function crearPublicacion(datos, opcionesOffline = {}) {
  try {
    const { data } = await apiClient.post('/hallado/publicaciones', datos);
    await guardarPublicacionEnCache(data.publicacion);
    return data.publicacion;
  } catch (e) {
    if (e.esDeConexion && opcionesOffline.permitirEncolar !== false) {
      // `pudoLlegar`: el pedido llegó a salir (ej. timeout). Si el servidor lo
      // procesó pero perdimos la respuesta, la cola verifica antes de reenviar.
      const pendiente = await encolarPublicacionPendiente(opcionesOffline.usuarioId, datos, {
        ...opcionesOffline,
        posibleEnvio: Boolean(e.pudoLlegar),
      });
      // `causaEncolado`: por qué quedó pendiente (sin red o servidor caído), para
      // que la confirmación diga lo que realmente pasó.
      return { ...pendiente, causaEncolado: e.causa ?? null };
    }
    throw e;
  }
}

// Las fotos se guardan con la URL relativa que devuelve el backend
// (/uploads/xxx.jpg) y no absoluta, para que no quede clavado el host con el
// que se subieron. Esta función es la que le pone el origen que corresponde
// al momento de mostrarlas.
//
// Las URLs externas (http) y las fotos locales en base64/archivo elegidas sin
// conexión pasan de largo.
export function urlDeFoto(url) {
  if (!url) return null;
  if (/^(https?:|data:|file:|content:)/i.test(url)) return url;
  // BASE_URL termina en /api y las fotos cuelgan de la raíz del backend.
  return BASE_URL.replace(/\/api\/?$/, '') + url;
}

// GET /hallado/publicaciones/:id
//
// El detalle del punto 4. Devuelve { publicacion, acciones }. Las acciones
// (si soy el publicador, si puedo reclamar y qué dice el botón) las decide el
// backend según quién pide: la app las muestra, no las calcula. Y la
// dirección exacta viene en null si no corresponde verla.
//
// Punto 6: al consultar con conexión se guarda en la caché local.
// Si falla por falta de red (`e.esDeConexion`), se devuelve la copia local
// con `desdeCache: true`.
export async function obtenerPublicacion(id) {
  try {
    const { data } = await apiClient.get(`/hallado/publicaciones/${id}`);
    await guardarPublicacionEnCache(data.publicacion, data.acciones);
    return { ...data, desdeCache: false };
  } catch (e) {
    if (e.esDeConexion) {
      const cacheada = await leerPublicacionDeCache(id);
      if (cacheada) return cacheada;
    }
    throw e;
  }
}

// POST / DELETE /hallado/publicaciones/:id/seguir
//
// "Cualquier persona puede seguir la publicación para enterarse de sus
// novedades." Las dos devuelven { laSigo, seguidores } y son idempotentes:
// un reintento no da error.
export async function seguirPublicacion(id) {
  const { data } = await apiClient.post(`/hallado/publicaciones/${id}/seguir`);
  return data;
}

export async function dejarDeSeguirPublicacion(id) {
  const { data } = await apiClient.delete(`/hallado/publicaciones/${id}/seguir`);
  return data;
}

// GET /hallado/seguidas
//
// La sección "Seguidas" del punto 9. Devuelve { seguidas, conNovedad }: las
// publicaciones que la persona sigue, en cualquier estado (a quien sigue
// algo le interesa justamente enterarse de que se resolvió o venció). Cada
// una trae, además de lo de siempre, el estado que la persona vio la última
// vez que la abrió (estadoVisto). Abrir el detalle lo actualiza solo.
export async function misSeguidas() {
  const { data } = await apiClient.get('/hallado/seguidas');
  return data;
}

// GET /hallado/publicaciones/mias
//
// Devuelve { publicaciones, resumen }. El resumen cuenta SIEMPRE el total,
// no lo filtrado: es lo que necesitan las solapas, porque si contara lo
// filtrado, parado en "Vencidas" diria "Abiertas: 0".
//
// Punto 6: antepone las publicaciones de la cola de pendientes que
// están esperando conexión para enviarse.
export async function misPublicaciones(estado, usuarioId = null) {
  const incluirPendientes = !estado || estado === 'ABIERTA';
  const pendientes =
    incluirPendientes && usuarioId ? await listarPublicacionesPendientes(usuarioId) : [];

  try {
    const { data } = await apiClient.get('/hallado/publicaciones/mias', {
      params: estado ? { estado } : undefined,
    });
    return {
      publicaciones: [...pendientes, ...data.publicaciones],
      resumen: data.resumen,
      desdeCache: false,
    };
  } catch (e) {
    if (e.esDeConexion && pendientes.length > 0) {
      // `soloPendientes`: son únicamente las locales. La pantalla las suma a
      // lo que ya tenía cargado en vez de reemplazar la lista del servidor.
      return {
        publicaciones: pendientes,
        resumen: null,
        desdeCache: true,
        soloPendientes: true,
      };
    }
    throw e;
  }
}

// POST /hallado/publicaciones/:id/renovar
//
// "Las publicaciones vencen a los 30 dias y pueden renovarse." Renovar corre
// el vencimiento 30 dias desde ahora, no desde el vencimiento viejo.
export async function renovarPublicacion(id) {
  const { data } = await apiClient.post(`/hallado/publicaciones/${id}/renovar`);
  return data.publicacion;
}

// DELETE /hallado/publicaciones/:id
export async function eliminarPublicacion(id) {
  const { data } = await apiClient.delete(`/hallado/publicaciones/${id}`);
  return data;
}

// GET /hallado/publicaciones
//
// El buscador del punto 3. Ojo con `queTePaso`: NO es el tipo que se quiere
// ver, es lo que le paso a la persona. El backend devuelve el OPUESTO, que
// es lo que pide el enunciado ("si perdiste algo, ves lo que otros
// encontraron"). Se llama asi justamente para que no se pueda confundir.
//
// Devuelve { publicaciones, paginado, desdeCache }.
// Punto 6: guarda la primera página exitosa en la caché local. Si
// no hay conexión (`e.esDeConexion`), devuelve los últimos resultados
// guardados con `desdeCache: true`.
export async function buscarPublicaciones(criterios) {
  const pagina = criterios.pagina ?? 1;

  try {
    const { data } = await apiClient.get('/hallado/publicaciones', {
      // axios saltea los undefined, asi que los filtros vacios no viajan.
      params: {
        queTePaso: criterios.queTePaso,
        q: criterios.q || undefined,
        categoriaId: criterios.categoriaId || undefined,
        barrioId: criterios.barrioId || undefined,
        cuando: criterios.cuando || undefined,
        desde: criterios.desde || undefined,
        hasta: criterios.hasta || undefined,
        orden: criterios.orden || undefined,
        lat: criterios.coordenadas?.lat,
        lng: criterios.coordenadas?.lng,
        pagina: criterios.pagina || undefined,
        limite: criterios.limite || undefined,
      },
    });

    if (pagina === 1) {
      await guardarResultadosBusquedaEnCache(data.publicaciones);
    } else {
      await guardarPublicacionesEnCache(data.publicaciones ?? []);
    }

    return { ...data, desdeCache: false };
  } catch (e) {
    // Si falla pedir la página 2+, relanzamos para que la pantalla conserve
    // la primera página ya cargada y muestre el aviso.
    if (e.esDeConexion && pagina === 1) {
      return leerUltimosResultadosDeCache(criterios);
    }
    throw e;
  }
}

// Descarta una publicación de la cola offline (por ejemplo una rechazada).
export { descartarPublicacionPendiente as descartarPendiente };

// Corregir una publicación que el servidor rechazó: pasa a borrador y el
// asistente de Publicar la retoma. Ver `convertirPendienteEnBorrador`.
export { convertirPendienteEnBorrador as editarPendiente };
