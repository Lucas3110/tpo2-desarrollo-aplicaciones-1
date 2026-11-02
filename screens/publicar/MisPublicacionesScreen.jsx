// Punto 5 y Punto 6: 'Sección "Mis publicaciones" con el estado de cada una
// (abierta, en reclamo, resuelta, vencida) y las pendientes de envío.'
//
// Sobre el refresco: cuando falla, NO se borra lo que ya estaba en pantalla.
// Se muestra un aviso arriba y la lista queda.
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
import Boton from '../../components/Boton';
import SelectorOpciones from '../../components/SelectorOpciones';
import { useAuth } from '../../hooks/useAuth';
import { useNetworkState } from '../../hooks/useNetworkState';
import {
  descartarPendiente,
  editarPendiente,
  misPublicaciones,
  renovarPublicacion,
  urlDeFoto,
} from '../../services/publicacionService';
import { isoATexto } from '../../utils/fechas';
import { TEXTOS } from '../../utils/mensajesConexion';
import { colors, fontSizes, radius, spacing } from '../../config/theme';

const FILTROS = [
  { valor: null, etiqueta: 'Todas' },
  { valor: 'ABIERTA', etiqueta: 'Abiertas' },
  { valor: 'EN_RECLAMO', etiqueta: 'En reclamo' },
  { valor: 'RESUELTA', etiqueta: 'Resueltas' },
  { valor: 'VENCIDA', etiqueta: 'Vencidas' },
];

const ESTADOS = {
  PENDIENTE_ENVIO: { texto: 'Pendiente de envío', color: colors.warning },
  ERROR_ENVIO: { texto: 'No se pudo enviar', color: colors.danger },
  ABIERTA: { texto: 'Abierta', color: colors.success },
  EN_RECLAMO: { texto: 'En reclamo', color: colors.warning },
  RESUELTA: { texto: 'Resuelta', color: colors.secondary },
  VENCIDA: { texto: 'Vencida', color: colors.danger },
};

export default function MisPublicacionesScreen({ navigation }) {
  const { usuario } = useAuth();
  const { conectado, motivoOffline, sincronizando, pendientesCount, refrescarContadorPendientes } =
    useNetworkState();

  const [publicaciones, setPublicaciones] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [desdeCache, setDesdeCache] = useState(false);
  const [filtro, setFiltro] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(null);
  const [renovando, setRenovando] = useState(null);
  const yaCargo = useRef(false);
  // Filtro con el que se cargó por última vez la lista del servidor. Si cambia
  // mientras no hay red, lo que había en pantalla ya no corresponde.
  const filtroCargado = useRef(null);

  const cargar = useCallback(
    async (estado, { esRefresco = false } = {}) => {
      if (!esRefresco && !yaCargo.current) setCargando(true);
      setError(null);
      try {
        const datos = await misPublicaciones(estado, usuario?.id);
        if (datos.soloPendientes) {
          // Sin conexión: se actualizan solo las pendientes locales y se
          // CONSERVA lo que ya había del servidor (si es del mismo filtro).
          const conservar = filtroCargado.current === estado;
          setPublicaciones((previas) => [
            ...datos.publicaciones,
            ...(conservar ? (previas ?? []).filter((p) => !p.esPendiente) : []),
          ]);
        } else {
          setPublicaciones(datos.publicaciones);
          filtroCargado.current = estado;
        }
        if (datos.resumen) setResumen(datos.resumen);
        setDesdeCache(Boolean(datos.desdeCache));
        yaCargo.current = true;
      } catch (e) {
        if (e.esDeConexion && yaCargo.current) {
          setDesdeCache(true);
        } else {
          setError(e.message);
        }
        // A propósito: no se toca `publicaciones`. Lo que ya estaba sigue ahí.
      } finally {
        setCargando(false);
        setRefrescando(false);
      }
    },
    [usuario?.id]
  );

  // useFocusEffect y no useEffect: al volver de publicar algo (o cuando
  // termina la sincronización automática y baja `pendientesCount`), la lista
  // se actualiza sola.
  useFocusEffect(
    useCallback(() => {
      cargar(filtro, { esRefresco: yaCargo.current });
    }, [filtro, pendientesCount, cargar])
  );

  const cambiarFiltro = (valor) => {
    setFiltro(valor);
  };

  const descartar = async (pendienteId) => {
    await descartarPendiente(pendienteId);
    await refrescarContadorPendientes();
    await cargar(filtro, { esRefresco: true });
  };

  // Una publicación que el servidor rechazó se puede corregir en vez de
  // descartarla y cargarla de cero: pasa a borrador y se abre el asistente en
  // el paso que tiene el dato objetado.
  const editar = async (pendienteId) => {
    const listo = await editarPendiente(pendienteId, usuario?.id);
    await refrescarContadorPendientes();
    if (listo) {
      navigation.navigate('Publicar', { retomar: Date.now() });
    } else {
      await cargar(filtro, { esRefresco: true });
    }
  };

  const renovar = async (id) => {
    if (!conectado) return;
    setRenovando(id);
    setError(null);
    try {
      await renovarPublicacion(id);
      await cargar(filtro, { esRefresco: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setRenovando(null);
    }
  };

  if (cargando && publicaciones === null) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.pantalla}>
      {resumen ? (
        <Text style={styles.resumen}>
          Abiertas: {resumen.abiertas} · En reclamo: {resumen.enReclamo} · Resueltas:{' '}
          {resumen.resueltas} · Vencidas: {resumen.vencidas}
        </Text>
      ) : null}

      <View style={styles.filtros}>
        <SelectorOpciones opciones={FILTROS} valor={filtro} onElegir={cambiarFiltro} />
      </View>

      {sincronizando ? (
        <View style={styles.avisoError}>
          <Aviso
            tipo="info"
            mensaje="Recuperaste la conexión. Enviando tus publicaciones pendientes…"
          />
        </View>
      ) : !conectado || desdeCache ? (
        <View style={styles.avisoError}>
          <Aviso
            tipo="info"
            mensaje={
              pendientesCount > 0
                ? TEXTOS.pendientesEnLista(motivoOffline)
                : TEXTOS.datosDesactualizados(motivoOffline)
            }
          />
        </View>
      ) : null}

      {error ? (
        <View style={styles.avisoError}>
          <Aviso mensaje={error} />
        </View>
      ) : null}

      <FlatList
        data={publicaciones ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => {
              setRefrescando(true);
              cargar(filtro, { esRefresco: true });
            }}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.vacioTitulo}>
              {filtro === null ? 'Todavía no publicaste nada' : 'No hay ninguna acá'}
            </Text>
            {filtro === null ? (
              <Boton titulo="Publicar algo" onPress={() => navigation.navigate('Publicar')} />
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const estado = ESTADOS[item.estado] ?? {
            texto: item.estado,
            color: colors.textSecondary,
          };
          const esPendiente = Boolean(item.pendienteDeEnvio);

          return (
            <TouchableOpacity
              style={styles.tarjeta}
              onPress={() => {
                if (!esPendiente) {
                  navigation.navigate('DetallePublicacion', { id: item.id });
                }
              }}
              disabled={esPendiente}
              activeOpacity={0.8}
            >
              <View style={styles.fila}>
                {item.portada ? (
                  <Image source={{ uri: urlDeFoto(item.portada) }} style={styles.miniatura} />
                ) : (
                  <View style={[styles.miniatura, styles.sinFoto]}>
                    <Text style={styles.sinFotoTexto}>Sin{'\n'}foto</Text>
                  </View>
                )}

                <View style={styles.datos}>
                  <View style={styles.encabezado}>
                    <Text style={styles.tipo}>
                      {item.tipo === 'PERDI' ? 'Perdí' : 'Encontré'}
                    </Text>
                    <View style={[styles.chip, { backgroundColor: estado.color }]}>
                      <Text style={styles.chipTexto}>{estado.texto}</Text>
                    </View>
                  </View>

                  <Text style={styles.titulo} numberOfLines={2}>
                    {item.titulo}
                  </Text>
                  <Text style={styles.detalle}>
                    {item.categoria.nombre} · {item.barrio.nombre}
                  </Text>
                  <Text style={styles.detalle}>
                    {item.estado === 'ERROR_ENVIO'
                      ? item.ultimoError || 'El servidor rechazó la publicación.'
                      : esPendiente
                      ? 'Se publicará automáticamente al recuperar la conexión'
                      : item.estado === 'VENCIDA'
                        ? `Venció el ${isoATexto(String(item.venceEn).slice(0, 10))}`
                        : `Vence en ${item.diasParaVencer} ${
                            item.diasParaVencer === 1 ? 'día' : 'días'
                          }`}
                  </Text>
                </View>
              </View>

              {item.estado === 'ERROR_ENVIO' ? (
                <View style={styles.accionesError}>
                  <TouchableOpacity
                    style={[styles.renovar, styles.accion]}
                    onPress={() => editar(item.pendienteId)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.renovarTexto}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.renovar, styles.accion]}
                    onPress={() => descartar(item.pendienteId)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.renovarTexto}>Descartar</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {!esPendiente &&
              item.puedeRenovarse &&
              (item.estado === 'VENCIDA' || item.diasParaVencer <= 5) ? (
                <TouchableOpacity
                  style={[styles.renovar, !conectado ? styles.deshabilitado : null]}
                  onPress={() => renovar(item.id)}
                  disabled={!conectado || renovando === item.id}
                  activeOpacity={0.7}
                >
                  <Text style={styles.renovarTexto}>
                    {renovando === item.id ? 'Renovando…' : 'Renovar por 30 días'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
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
  },
  resumen: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  filtros: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  avisoError: {
    paddingHorizontal: spacing.lg,
  },
  lista: {
    padding: spacing.lg,
    paddingTop: 0,
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
  renovar: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  renovarTexto: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
  accionesError: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  accion: {
    flex: 1,
  },
  deshabilitado: {
    opacity: 0.5,
  },
  vacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  vacioTitulo: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
});
