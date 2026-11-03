// Punto 4 y Punto 6: el detalle de una publicación, con soporte offline.
//
// "Galería con todas las fotos, descripción, categoría, fecha y franja
// horaria del suceso, estado de la publicación (abierta, en reclamo,
// resuelta) y el barrio donde ocurrió. Datos del publicador con su
// reputación y acceso a su perfil público."
//
// Punto 6:
// - Si no hay red, `obtenerPublicacion` lee de la caché local de
//   publicaciones y devuelve `desdeCache: true`.
// - Si un refresco falla por falta de red y ya había datos en pantalla, no
//   se borra nada y se advierte con `<Aviso tipo="info" />`.
// - Usa `useNetworkState()` para deshabilitar las acciones online (reclamar,
//   seguir, renovar, eliminar) con un mensaje claro.
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Aviso from '../../components/Aviso';
import Boton from '../../components/Boton';
import GaleriaFotos from '../../components/GaleriaFotos';
import { useNetworkState } from '../../hooks/useNetworkState';
import { TEXTOS } from '../../utils/mensajesConexion';
import {
  dejarDeSeguirPublicacion,
  eliminarPublicacion,
  obtenerPublicacion,
  renovarPublicacion,
  seguirPublicacion,
} from '../../services/publicacionService';
import { formatearCoordenadas } from '../../services/ubicacionService';
import { describirFecha, mesYAnio } from '../../utils/fechas';
import { describirEstado, describirFranja, describirTipo } from '../../utils/publicaciones';
import { colors, fontSizes, radius, spacing } from '../../config/theme';

export default function DetallePublicacionScreen({ navigation, route }) {
  const { id } = route.params;
  const { conectado, motivoOffline } = useNetworkState();

  // { publicacion, acciones }. null hasta que carga por primera vez.
  const [detalle, setDetalle] = useState(null);
  const [desdeCache, setDesdeCache] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(null);

  // Qué acción está en curso (seguir, renovar, eliminar), para el spinner
  // del botón y para que no se pueda tocar dos veces.
  const [accionEnCurso, setAccionEnCurso] = useState(null);

  // Si ya hubo una carga buena, las siguientes no tapan la pantalla con el
  // spinner: lo que ya estaba sigue a la vista mientras llega lo nuevo.
  const yaCargo = useRef(false);

  async function cargar({ esRefresco = false } = {}) {
    if (!yaCargo.current && !esRefresco) setCargando(true);
    setError(null);
    try {
      const datos = await obtenerPublicacion(id);
      setDetalle(datos);
      setDesdeCache(Boolean(datos.desdeCache));
      yaCargo.current = true;
    } catch (e) {
      // A propósito no se toca `detalle`: si falló el refresco, lo anterior
      // queda en pantalla. Si el fallo fue de conexión y ya teníamos datos,
      // mostramos el aviso informativo de desactualización en lugar de error.
      if (e.esDeConexion && yaCargo.current) {
        setDesdeCache(true);
      } else if (e.esDeConexion) {
        // Sin conexión y sin copia guardada: nunca se vio esta publicación.
        setError(TEXTOS.detalleNoDisponible(e.causa));
      } else {
        setError(e.message);
      }
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }

  // useFocusEffect y no useEffect: al volver de reclamar o de seguir, el
  // estado y las acciones tienen que reflejar lo que acaba de pasar.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [id])
  );

  // Seguir / dejar de seguir. El backend contesta { laSigo, seguidores } y
  // con eso se actualiza el detalle sin volver a pedirlo entero.
  async function alternarSeguir() {
    if (!conectado) return;
    const { publicacion } = detalle;
    setAccionEnCurso('seguir');
    setError(null);
    try {
      const respuesta = publicacion.laSigo
        ? await dejarDeSeguirPublicacion(id)
        : await seguirPublicacion(id);
      setDetalle({ ...detalle, publicacion: { ...publicacion, ...respuesta } });
    } catch (e) {
      setError(e.message);
    } finally {
      setAccionEnCurso(null);
    }
  }

  // "Si es el propio publicador, accede a la gestión de su publicación."
  async function renovar() {
    if (!conectado) return;
    setAccionEnCurso('renovar');
    setError(null);
    try {
      await renovarPublicacion(id);
      await cargar({ esRefresco: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setAccionEnCurso(null);
    }
  }

  function confirmarEliminar() {
    if (!conectado) return;
    // Es la única acción de la pantalla que no se puede deshacer: se
    // pregunta antes.
    Alert.alert('Eliminar publicación', '¿Seguro? Esto no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: eliminar },
    ]);
  }

  async function eliminar() {
    setAccionEnCurso('eliminar');
    setError(null);
    try {
      await eliminarPublicacion(id);
      navigation.goBack();
    } catch (e) {
      // Por ejemplo, PUBLICACION_EN_RECLAMO: hay alguien esperando respuesta.
      setError(e.message);
      setAccionEnCurso(null);
    }
  }

  function irAReclamar() {
    if (!conectado) return;
    const { publicacion, acciones } = detalle;
    navigation.navigate('Reclamar', {
      publicacionId: publicacion.id,
      tipo: acciones.reclamo,
      titulo: publicacion.titulo,
      pregunta: publicacion.preguntaVerificacion,
    });
  }

  if (cargando && detalle === null) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (detalle === null) {
    return (
      <View style={styles.centrado}>
        <Aviso mensaje={error} />
        <Boton titulo="Reintentar" onPress={() => cargar()} />
      </View>
    );
  }

  const { publicacion, acciones } = detalle;
  const estado = describirEstado(publicacion.estado);
  const franja = describirFranja(publicacion.franjaHoraria);
  const mostrarAvisoOffline = !conectado || desdeCache;

  return (
    <ScrollView
      style={styles.pantalla}
      contentContainerStyle={styles.contenido}
      refreshControl={
        <RefreshControl
          refreshing={refrescando}
          onRefresh={() => {
            setRefrescando(true);
            cargar({ esRefresco: true });
          }}
          colors={[colors.primary]}
        />
      }
    >
      <GaleriaFotos fotos={publicacion.fotos} />

      <View style={styles.cuerpo}>
        {mostrarAvisoOffline ? (
          <Aviso
            tipo="info"
            mensaje={TEXTOS.copiaGuardadaDetalle(motivoOffline)}
          />
        ) : null}

        {error ? <Aviso mensaje={error} /> : null}

        <View style={styles.encabezado}>
          <Text style={styles.tipo}>{describirTipo(publicacion.tipo)}</Text>
          <View style={[styles.chip, { backgroundColor: estado.color }]}>
            <Text style={styles.chipTexto}>{estado.texto}</Text>
          </View>
        </View>

        <Text style={styles.titulo}>{publicacion.titulo}</Text>

        <Text style={styles.subtitulo}>
          {publicacion.categoria.nombre} · {publicacion.barrio.nombre}
        </Text>

        <Text style={styles.cuando}>
          Ocurrió {describirFecha(publicacion.fechaSuceso)}
          {franja ? `, ${franja}` : ''}
        </Text>

        {/* "Acciones disponibles según quién esté mirando." Cuáles hay lo
            dijo el backend; si no hay conexión quedan deshabilitadas con un
            mensaje claro. */}
        {acciones.esPublicador ? (
          <Gestion
            publicacion={publicacion}
            conectado={conectado}
            accionEnCurso={accionEnCurso}
            onRenovar={renovar}
            onEliminar={confirmarEliminar}
            onVerReclamos={() => navigation.navigate('MisReclamos')}
          />
        ) : (
          <AccionesDeTercero
            publicacion={publicacion}
            acciones={acciones}
            conectado={conectado}
            accionEnCurso={accionEnCurso}
            onReclamar={irAReclamar}
            onSeguir={alternarSeguir}
          />
        )}

        <Seccion titulo="Descripción">
          <Text style={publicacion.descripcion ? styles.texto : styles.textoVacio}>
            {publicacion.descripcion ?? 'Sin descripción.'}
          </Text>
        </Seccion>

        <Seccion titulo="Dónde">
          <Text style={styles.texto}>{publicacion.barrio.nombre}</Text>

          {/* La dirección exacta sólo viaja cuando corresponde verla. Si el
              backend la ocultó, se dice por qué: un dato que falta sin
              explicación parece un error de la app. */}
          {publicacion.direccion ? (
            <Text style={styles.texto}>{publicacion.direccion}</Text>
          ) : publicacion.direccionOculta ? (
            <Text style={styles.nota}>
              La dirección exacta se muestra cuando el reclamo es aceptado.
            </Text>
          ) : null}

          {publicacion.coordenadas ? (
            <Text style={styles.nota}>
              Coordenadas aproximadas: {formatearCoordenadas(publicacion.coordenadas)}
            </Text>
          ) : null}
        </Seccion>

        {publicacion.preguntaVerificacion ? (
          <Seccion titulo="Pregunta de verificación">
            <Text style={styles.texto}>{publicacion.preguntaVerificacion}</Text>
            <Text style={styles.nota}>
              {acciones.esPublicador
                ? 'Quien diga que es suyo va a tener que responderla.'
                : 'Si es tuyo, vas a tener que responderla para reclamarlo.'}
            </Text>
          </Seccion>
        ) : null}

        <Publicador
          publicador={publicacion.publicador}
          esPublicador={acciones.esPublicador}
          conectado={conectado}
          onVerPerfil={() => navigation.navigate('PerfilPublico', { id: publicacion.publicador.id })}
        />
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------

// Lo que puede hacer alguien que no publicó: reclamar y seguir.
//
// El botón de reclamar dice "Es mío" en algo encontrado y "Lo encontré" en
// algo perdido. Cuando no se puede reclamar (o no hay conexión), el botón
// queda atenuado y abajo se explica por qué: un botón gris sin explicación
// parece roto.
function AccionesDeTercero({
  publicacion,
  acciones,
  conectado,
  accionEnCurso,
  onReclamar,
  onSeguir,
}) {
  const { motivoOffline } = useNetworkState();
  const etiqueta = acciones.reclamo === 'ES_MIO' ? 'Es mío' : 'Lo encontré';

  return (
    <View style={styles.acciones}>
      <Boton
        titulo={etiqueta}
        onPress={onReclamar}
        deshabilitado={!conectado || !acciones.puedeReclamar}
      />
      <Text style={styles.nota}>
        {!conectado
          ? TEXTOS.necesitaConexion(motivoOffline, 'reclamar esta publicación')
          : explicarReclamo(publicacion, acciones)}
      </Text>

      {acciones.puedeSeguir || !conectado ? (
        <View style={styles.seguir}>
          <Boton
            titulo={publicacion.laSigo ? 'Dejar de seguir' : 'Seguir esta publicación'}
            onPress={onSeguir}
            cargando={accionEnCurso === 'seguir'}
            deshabilitado={!conectado || accionEnCurso !== null || !acciones.puedeSeguir}
            variante="secundario"
          />
          <Text style={styles.nota}>
            {!conectado
              ? TEXTOS.necesitaConexion(motivoOffline, 'seguir esta publicación')
              : publicacion.laSigo
                ? 'La seguís: te vas a enterar cuando cambie de estado.'
                : publicacion.seguidores > 0
                  ? `${plural(publicacion.seguidores, 'persona la sigue', 'personas la siguen')}.`
                  : 'Seguila para enterarte cuando cambie de estado.'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// Por qué se puede o no reclamar, en una línea.
function explicarReclamo(publicacion, acciones) {
  const { miReclamo, intentosRestantes, estado } = publicacion;

  if (miReclamo?.estado === 'PENDIENTE') {
    return 'Ya enviaste un reclamo. Está esperando la respuesta del publicador.';
  }
  if (miReclamo?.estado === 'ACEPTADO') {
    return 'Tu reclamo fue aceptado. Ya podés ver la dirección exacta más abajo.';
  }
  if (estado === 'RESUELTA') return 'Esta publicación ya se resolvió.';
  if (estado === 'VENCIDA') return 'Esta publicación venció.';
  if (intentosRestantes === 0) return 'Ya usaste los 3 intentos para esta publicación.';

  const base =
    acciones.reclamo === 'ES_MIO'
      ? 'Si es tuyo, vas a tener que responder la pregunta de verificación.'
      : 'Si lo encontraste, vas a tener que adjuntar una foto y el barrio.';

  if (miReclamo?.estado === 'RECHAZADO' || miReclamo?.estado === 'VENCIDO') {
    return `${base} Te ${
      intentosRestantes === 1 ? 'queda 1 intento' : `quedan ${intentosRestantes} intentos`
    }.`;
  }
  return base;
}

// Lo que puede hacer el publicador con lo suyo.
function Gestion({
  publicacion,
  conectado,
  accionEnCurso,
  onRenovar,
  onEliminar,
  onVerReclamos,
}) {
  const { motivoOffline } = useNetworkState();
  const { reclamosPendientes, estado, venceEn } = publicacion;

  return (
    <View style={styles.gestion}>
      <Text style={styles.seccionTitulo}>Tu publicación</Text>

      {reclamosPendientes > 0 ? (
        <TouchableOpacity
          style={[styles.pendientes, !conectado ? styles.deshabilitado : null]}
          onPress={onVerReclamos}
          disabled={!conectado}
          activeOpacity={0.7}
        >
          <Text style={styles.pendientesTexto}>
            {plural(reclamosPendientes, 'reclamo espera', 'reclamos esperan')} tu respuesta
          </Text>
          <Text style={styles.enlace}>Ver reclamos</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.nota}>
          {estado === 'RESUELTA'
            ? 'Resuelta: el objeto ya volvió con su dueño.'
            : estado === 'VENCIDA'
              ? 'Venció. Si todavía corresponde, renovala por 30 días más.'
              : venceEn
                ? `Vence el ${describirFecha(String(venceEn).slice(0, 10))}. Todavía nadie la reclamó.`
                : 'Publicación activa.'}
        </Text>
      )}

      <View style={styles.gestionBotones}>
        {estado !== 'RESUELTA' ? (
          <Boton
            titulo="Renovar por 30 días"
            onPress={onRenovar}
            cargando={accionEnCurso === 'renovar'}
            deshabilitado={!conectado || accionEnCurso !== null}
            variante="secundario"
          />
        ) : null}
        <TouchableOpacity
          style={[styles.eliminar, !conectado ? styles.deshabilitado : null]}
          onPress={onEliminar}
          disabled={!conectado || accionEnCurso !== null}
          hitSlop={8}
        >
          <Text style={styles.eliminarTexto}>
            {accionEnCurso === 'eliminar' ? 'Eliminando…' : 'Eliminar publicación'}
          </Text>
        </TouchableOpacity>

        {!conectado ? (
          <Text style={styles.nota}>
            {TEXTOS.necesitaConexion(motivoOffline, 'renovar, eliminar o gestionar reclamos')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function Seccion({ titulo, children }) {
  return (
    <View style={styles.seccion}>
      <Text style={styles.seccionTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

// "Datos del publicador con su reputación y acceso a su perfil público."
function Publicador({ publicador, esPublicador, conectado, onVerPerfil }) {
  const reputacion = publicador?.reputacion ?? { devoluciones: 0, recuperos: 0 };

  return (
    <View style={styles.publicador}>
      <Text style={styles.seccionTitulo}>{esPublicador ? 'Publicaste vos' : 'Publicado por'}</Text>

      <View style={styles.publicadorFila}>
        {publicador.fotoUrl ? (
          <Image source={{ uri: publicador.fotoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarVacio]}>
            <Text style={styles.avatarInicial}>{inicialDe(publicador.nombre)}</Text>
          </View>
        )}

        <View style={styles.publicadorDatos}>
          <Text style={styles.publicadorNombre}>{publicador.nombre}</Text>
          <Text style={styles.nota}>
            {plural(reputacion.devoluciones, 'devolución', 'devoluciones')} ·{' '}
            {plural(reputacion.recuperos, 'recupero', 'recuperos')}
          </Text>
          {publicador.miembroDesde ? (
            <Text style={styles.nota}>Miembro desde {mesYAnio(publicador.miembroDesde)}</Text>
          ) : null}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.enlaceContenedor, !conectado ? styles.deshabilitado : null]}
        onPress={onVerPerfil}
        disabled={!conectado}
        hitSlop={8}
      >
        <Text style={styles.enlace}>Ver perfil público</Text>
      </TouchableOpacity>
    </View>
  );
}

function inicialDe(nombre) {
  return String(nombre ?? '?').trim().charAt(0).toUpperCase() || '?';
}

function plural(cantidad, singular, plurales) {
  return `${cantidad} ${cantidad === 1 ? singular : plurales}`;
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contenido: {
    paddingBottom: spacing.xl,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  cuerpo: {
    padding: spacing.lg,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  tipo: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chip: {
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  chipTexto: {
    color: colors.white,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
  },
  titulo: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitulo: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cuando: {
    fontSize: fontSizes.sm,
    color: colors.text,
    marginTop: spacing.xs,
  },
  acciones: {
    marginTop: spacing.lg,
  },
  seguir: {
    marginTop: spacing.md,
  },
  gestion: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  pendientes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  pendientesTexto: {
    fontSize: fontSizes.sm,
    color: '#8D6E00',
    fontWeight: 'bold',
  },
  gestionBotones: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  eliminar: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  eliminarTexto: {
    color: colors.danger,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
  deshabilitado: {
    opacity: 0.5,
  },
  seccion: {
    marginTop: spacing.lg,
  },
  seccionTitulo: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  texto: {
    fontSize: fontSizes.md,
    color: colors.text,
    lineHeight: 22,
  },
  textoVacio: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  nota: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  publicador: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  publicadorFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
  },
  avatarVacio: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarInicial: {
    color: colors.white,
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
  },
  publicadorDatos: {
    flex: 1,
  },
  publicadorNombre: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
  },
  enlaceContenedor: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  enlace: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
});
