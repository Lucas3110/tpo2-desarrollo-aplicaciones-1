// Punto 5: 'Sección "Mis publicaciones" con el estado de cada una (abierta,
// en reclamo, resuelta, vencida). Las publicaciones vencen a los 30 días y
// pueden renovarse.'
//
// Sobre el refresco: cuando falla, NO se borra lo que ya estaba en pantalla.
// Se muestra un aviso arriba y la lista queda. En la entrega anterior pasaba
// al revés y el resultado era que, al volver de un túnel, la pantalla se
// vaciaba y parecía que se habían borrado las publicaciones.
import { useCallback, useState } from 'react';
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
import {
  misPublicaciones,
  renovarPublicacion,
  urlDeFoto,
} from '../../services/publicacionService';
import { isoATexto } from '../../utils/fechas';
import { colors, fontSizes, radius, spacing } from '../../config/theme';

const FILTROS = [
  { valor: null, etiqueta: 'Todas' },
  { valor: 'ABIERTA', etiqueta: 'Abiertas' },
  { valor: 'EN_RECLAMO', etiqueta: 'En reclamo' },
  { valor: 'RESUELTA', etiqueta: 'Resueltas' },
  { valor: 'VENCIDA', etiqueta: 'Vencidas' },
];

const ESTADOS = {
  ABIERTA: { texto: 'Abierta', color: colors.success },
  EN_RECLAMO: { texto: 'En reclamo', color: colors.warning },
  RESUELTA: { texto: 'Resuelta', color: colors.secondary },
  VENCIDA: { texto: 'Vencida', color: colors.danger },
};

export default function MisPublicacionesScreen({ navigation }) {
  const [publicaciones, setPublicaciones] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [filtro, setFiltro] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(null);
  const [renovando, setRenovando] = useState(null);

  const cargar = useCallback(
    async (estado, { esRefresco = false } = {}) => {
      // El spinner grande sólo si no hay nada que mostrar todavía. Si ya hay
      // una lista, taparla con un spinner es peor que dejarla un segundo
      // desactualizada.
      if (!esRefresco && publicaciones === null) setCargando(true);
      setError(null);
      try {
        const datos = await misPublicaciones(estado);
        setPublicaciones(datos.publicaciones);
        setResumen(datos.resumen);
      } catch (e) {
        setError(e.message);
        // A propósito: no se toca `publicaciones`. Lo que ya estaba sigue ahí.
      } finally {
        setCargando(false);
        setRefrescando(false);
      }
    },
    [publicaciones]
  );

  // useFocusEffect y no useEffect: al volver de publicar algo, la lista tiene
  // que traer lo nuevo. Con useEffect la pantalla queda montada y no se
  // entera.
  useFocusEffect(
    useCallback(() => {
      cargar(filtro);
      // Sólo cuando cambia el filtro o se vuelve a la pantalla.
    }, [filtro])
  );

  const cambiarFiltro = (valor) => {
    setFiltro(valor);
    setPublicaciones(null);
  };

  const renovar = async (id) => {
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
          const estado = ESTADOS[item.estado] ?? { texto: item.estado, color: colors.textSecondary };
          return (
            <View style={styles.tarjeta}>
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
                    {item.estado === 'VENCIDA'
                      ? `Venció el ${isoATexto(String(item.venceEn).slice(0, 10))}`
                      : `Vence en ${item.diasParaVencer} ${item.diasParaVencer === 1 ? 'día' : 'días'}`}
                  </Text>
                </View>
              </View>

              {/* Renovar se ofrece siempre que se pueda, pero se destaca sólo
                  cuando hace falta de verdad: vencida, o a punto de vencer. */}
              {item.puedeRenovarse && (item.estado === 'VENCIDA' || item.diasParaVencer <= 5) ? (
                <TouchableOpacity
                  style={styles.renovar}
                  onPress={() => renovar(item.id)}
                  disabled={renovando === item.id}
                  activeOpacity={0.7}
                >
                  <Text style={styles.renovarTexto}>
                    {renovando === item.id ? 'Renovando…' : 'Renovar por 30 días'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
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
