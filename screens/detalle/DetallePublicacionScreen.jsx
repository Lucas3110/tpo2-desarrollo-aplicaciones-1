// Punto 4: el detalle de una publicación.
//
// "Galería con todas las fotos, descripción, categoría, fecha y franja
// horaria del suceso, estado de la publicación (abierta, en reclamo,
// resuelta) y el barrio donde ocurrió. Datos del publicador con su
// reputación y acceso a su perfil público."
//
// Qué se ve depende de quién mira, pero eso NO lo decide la app: el backend
// manda `acciones` ya resueltas (si soy el publicador, si puedo reclamar, qué
// dice el botón). Así la regla vive en un solo lugar y no se desincroniza.
// Con la dirección exacta pasa lo mismo: si no corresponde mostrarla,
// directamente no viaja.
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
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
import { obtenerPublicacion } from '../../services/publicacionService';
import { formatearCoordenadas } from '../../services/ubicacionService';
import { describirFecha, mesYAnio } from '../../utils/fechas';
import { describirEstado, describirFranja, describirTipo } from '../../utils/publicaciones';
import { colors, fontSizes, radius, spacing } from '../../config/theme';

export default function DetallePublicacionScreen({ navigation, route }) {
  const { id } = route.params;

  // { publicacion, acciones }. null hasta que carga por primera vez.
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(null);

  // Si ya hubo una carga buena, las siguientes no tapan la pantalla con el
  // spinner: lo que ya estaba sigue a la vista mientras llega lo nuevo.
  const yaCargo = useRef(false);

  async function cargar({ esRefresco = false } = {}) {
    if (!yaCargo.current && !esRefresco) setCargando(true);
    setError(null);
    try {
      setDetalle(await obtenerPublicacion(id));
      yaCargo.current = true;
    } catch (e) {
      // A propósito no se toca `detalle`: si falló el refresco, lo anterior
      // queda en pantalla y el aviso va arriba.
      setError(e.message);
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
          onVerPerfil={() => navigation.navigate('PerfilPublico', { id: publicacion.publicador.id })}
        />
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------

function Seccion({ titulo, children }) {
  return (
    <View style={styles.seccion}>
      <Text style={styles.seccionTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

// "Datos del publicador con su reputación y acceso a su perfil público."
//
// La reputación de Hallado se cuenta en casos cerrados, no en estrellas:
// cuántas veces devolvió algo y cuántas recuperó lo suyo.
function Publicador({ publicador, esPublicador, onVerPerfil }) {
  const { reputacion } = publicador;

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

      <TouchableOpacity style={styles.enlaceContenedor} onPress={onVerPerfil} hitSlop={8}>
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
  seccion: {
    marginTop: spacing.lg,
  },
  seccionTitulo: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  texto: {
    fontSize: fontSizes.md,
    color: colors.text,
    lineHeight: 22,
  },
  textoVacio: {
    fontSize: fontSizes.md,
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
