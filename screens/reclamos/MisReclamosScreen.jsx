// Punto 7: 'Sección "Mis reclamos" donde la persona ve, en un mismo lugar y
// siempre actualizados, los reclamos que envió y los que recibió.'
//
// "Siempre actualizados" se resuelve de tres maneras: se vuelve a pedir
// cada vez que la pantalla toma foco (useFocusEffect), se puede tirar para
// refrescar, y el backend aplica los vencimientos antes de contestar, así
// que un reclamo que pasó las 48 horas ya llega como VENCIDO.
//
// Las dos listas vienen en el mismo pedido y se muestran en solapas: son
// dos papeles distintos (lo que pedí, lo que me piden) y mezclarlos en una
// sola lista obligaría a leer cada tarjeta para saber de qué lado está uno.
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Aviso from '../../components/Aviso';
import { urlDeFoto } from '../../services/publicacionService';
import { misReclamos } from '../../services/reclamoService';
import { isoATexto } from '../../utils/fechas';
import {
  describirEstadoReclamo,
  describirTipoReclamo,
  describirVencimiento,
} from '../../utils/reclamos';
import { colors, fontSizes, radius, spacing } from '../../config/theme';

export default function MisReclamosScreen({ navigation }) {
  // { enviados, recibidos, resumen }. null hasta la primera carga.
  const [datos, setDatos] = useState(null);
  const [solapa, setSolapa] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(null);
  const yaCargo = useRef(false);

  async function cargar({ esRefresco = false } = {}) {
    if (!yaCargo.current && !esRefresco) setCargando(true);
    setError(null);
    try {
      const respuesta = await misReclamos();
      setDatos(respuesta);
      // La primera vez se abre la solapa que pide algo: si hay reclamos
      // esperando mi respuesta, esa; si no, los que envié.
      if (!yaCargo.current) {
        setSolapa(respuesta.resumen.recibidosPendientes > 0 ? 'recibidos' : 'enviados');
      }
      yaCargo.current = true;
    } catch (e) {
      // Lo que ya estaba sigue en pantalla; el aviso va arriba.
      setError(e.message);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [])
  );

  if (cargando && datos === null) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (datos === null) {
    return (
      <View style={styles.centrado}>
        <Aviso mensaje={error} />
        <TouchableOpacity onPress={() => cargar()}>
          <Text style={styles.enlace}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lista = solapa === 'recibidos' ? datos.recibidos : datos.enviados;

  return (
    <View style={styles.pantalla}>
      <View style={styles.solapas}>
        <Solapa
          titulo="Recibidos"
          pendientes={datos.resumen.recibidosPendientes}
          activa={solapa === 'recibidos'}
          onPress={() => setSolapa('recibidos')}
        />
        <Solapa
          titulo="Enviados"
          pendientes={datos.resumen.enviadosPendientes}
          activa={solapa === 'enviados'}
          onPress={() => setSolapa('enviados')}
        />
      </View>

      {error ? (
        <View style={styles.avisoError}>
          <Aviso mensaje={error} />
        </View>
      ) : null}

      <FlatList
        data={lista}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.lista}
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
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.vacioTitulo}>
              {solapa === 'recibidos' ? 'Nadie reclamó tus publicaciones todavía' : 'No enviaste ningún reclamo'}
            </Text>
            <Text style={styles.vacioTexto}>
              {solapa === 'recibidos'
                ? 'Cuando alguien diga "Es mío" o "Lo encontré" sobre algo tuyo, lo vas a ver acá.'
                : 'Desde el detalle de una publicación podés indicar "Es mío" o "Lo encontré".'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TarjetaReclamo
            reclamo={item}
            onPress={() => navigation.navigate('DetalleReclamo', { id: item.id })}
          />
        )}
      />
    </View>
  );
}

// ---------------------------------------------------------------

function Solapa({ titulo, pendientes, activa, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.solapa, activa ? styles.solapaActiva : null]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.solapaTexto, activa ? styles.solapaTextoActiva : null]}>{titulo}</Text>
      {pendientes > 0 ? (
        <View style={styles.globo}>
          <Text style={styles.globoTexto}>{pendientes}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// Una tarjeta por reclamo: qué objeto, de qué lado estoy, con quién, en qué
// estado, y lo que importa de ese estado (cuánto falta para que venza, por
// qué lo rechazaron).
function TarjetaReclamo({ reclamo, onPress }) {
  const estado = describirEstadoReclamo(reclamo.estado);
  const { publicacion } = reclamo;

  return (
    <TouchableOpacity style={styles.tarjeta} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.fila}>
        {publicacion.portada ? (
          <Image source={{ uri: urlDeFoto(publicacion.portada) }} style={styles.miniatura} />
        ) : (
          <View style={[styles.miniatura, styles.sinFoto]}>
            <Text style={styles.sinFotoTexto}>Sin{'\n'}foto</Text>
          </View>
        )}

        <View style={styles.datos}>
          <View style={styles.encabezado}>
            <Text style={styles.tipo}>{describirTipoReclamo(reclamo.tipo)}</Text>
            <View style={[styles.chip, { backgroundColor: estado.color }]}>
              <Text style={styles.chipTexto}>{estado.texto}</Text>
            </View>
          </View>

          <Text style={styles.titulo} numberOfLines={2}>
            {publicacion.titulo}
          </Text>

          <Text style={styles.detalle}>
            {reclamo.soyElPublicador
              ? `Reclama ${reclamo.reclamante.nombre}`
              : `Publicó ${reclamo.publicador.nombre}`}
            {' · '}
            {isoATexto(String(reclamo.creadoEn).slice(0, 10))}
          </Text>

          <Text style={[styles.detalle, reclamo.esperaMiRespuesta ? styles.destacado : null]}>
            {describirSituacion(reclamo)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function describirSituacion(reclamo) {
  if (reclamo.estado === 'PENDIENTE') {
    const vence = describirVencimiento(reclamo.horasParaVencer);
    return reclamo.esperaMiRespuesta ? `Espera tu respuesta · ${vence}` : `Esperando respuesta · ${vence}`;
  }
  if (reclamo.estado === 'ACEPTADO') {
    return reclamo.soyElReclamante ? 'Te lo aceptaron' : 'Lo aceptaste';
  }
  if (reclamo.estado === 'RECHAZADO') {
    return reclamo.motivo ? `Rechazado: ${reclamo.motivo}` : 'Rechazado';
  }
  return 'Venció sin respuesta';
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  solapas: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  solapa: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  solapaActiva: {
    borderBottomColor: colors.primary,
  },
  solapaTexto: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  solapaTextoActiva: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  globo: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  globoTexto: {
    color: colors.white,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
  },
  avisoError: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  lista: {
    padding: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
  },
  tarjeta: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  fila: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  miniatura: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  sinFoto: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sinFotoTexto: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  datos: {
    flex: 1,
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
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: 'bold',
  },
  detalle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  destacado: {
    color: colors.text,
    fontWeight: 'bold',
  },
  vacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  vacioTitulo: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  vacioTexto: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  enlace: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
});
