// Punto 9: lo que encuentra una alerta.
//
// Es la búsqueda guardada vuelta a correr, con el mismo paginado que los
// resultados del punto 3. No se reutiliza ResultadosScreen a propósito:
// allá se pueden ajustar los filtros, y acá cambiarlos sería otra búsqueda,
// no esta alerta. Además lo que publicó uno mismo no aparece: no es una
// novedad para quien lo publicó.
//
// Abrir la alerta es ver sus novedades, así que al salir de la pantalla lo
// publicado hasta ahora deja de contar como nuevo. Se marca al salir y no
// al entrar: si se marcara al entrar, la página 2 llegaría ya marcada.
// Mientras tanto, las nuevas quedan marcadas en la lista.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Aviso from '../../components/Aviso';
import IndicadorNovedad from '../../components/IndicadorNovedad';
import TarjetaResultado from '../../components/TarjetaResultado';
import { marcarAlertaVista, publicacionesDeAlerta } from '../../services/alertaService';
import { describirAlerta } from '../../utils/publicaciones';
import { colors, fontSizes, spacing } from '../../config/theme';

const LIMITE = 10;

export default function AlertaResultadosScreen({ navigation, route }) {
  const { id } = route.params;

  const [alerta, setAlerta] = useState(null);
  const [publicaciones, setPublicaciones] = useState(null);
  const [paginado, setPaginado] = useState(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(null);

  const cargar = useCallback(
    async ({ pagina = 1 } = {}) => {
      if (pagina > 1) setCargandoMas(true);
      setError(null);
      try {
        const datos = await publicacionesDeAlerta(id, { pagina, limite: LIMITE });
        setAlerta(datos.alerta);
        setPublicaciones((previas) =>
          pagina === 1 ? datos.publicaciones : [...(previas ?? []), ...datos.publicaciones]
        );
        setPaginado(datos.paginado);
      } catch (e) {
        setError(e.message);
      } finally {
        setCargandoMas(false);
        setRefrescando(false);
      }
    },
    [id]
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Al salir se espera a que quede marcada: "Mis alertas" se recarga apenas
  // vuelve a tomar foco, y si el pedido llegara después seguiría mostrando
  // el contador viejo. Si falla no pasa nada grave: la próxima vez sigue
  // diciendo que hay nuevas, que es mejor que perder un aviso.
  const yaMarcada = useRef(false);
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (evento) => {
        // El dispatch de abajo vuelve a disparar este evento.
        if (yaMarcada.current) return;
        evento.preventDefault();
        yaMarcada.current = true;
        marcarAlertaVista(id)
          .catch(() => {})
          .finally(() => navigation.dispatch(evento.data.action));
      }),
    [navigation, id]
  );

  if (publicaciones === null) {
    return (
      <View style={styles.centrado}>
        {error ? <Aviso mensaje={error} /> : <ActivityIndicator size="large" color={colors.primary} />}
      </View>
    );
  }

  return (
    <View style={styles.pantalla}>
      <View style={styles.resumen}>
        <Text style={styles.resumenTexto}>{describirAlerta(alerta)}</Text>
        <Text style={styles.resumenTotal}>
          {paginado.total === 0
            ? 'Sin resultados'
            : `${paginado.total} ${paginado.total === 1 ? 'resultado' : 'resultados'}`}
          {alerta.nuevas > 0
            ? ` · ${alerta.nuevas} ${alerta.nuevas === 1 ? 'nueva' : 'nuevas'}`
            : ''}
        </Text>
      </View>

      {!alerta.activa ? (
        <View style={styles.aviso}>
          <Aviso tipo="info" mensaje="Esta alerta está pausada: no te avisa de lo que se publique." />
        </View>
      ) : null}

      {error ? (
        <View style={styles.aviso}>
          <Aviso mensaje={error} />
        </View>
      ) : null}

      <FlatList
        data={publicaciones}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => {
              setRefrescando(true);
              cargar();
            }}
            colors={[colors.primary]}
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (cargandoMas || !paginado?.hayMas) return;
          cargar({ pagina: paginado.pagina + 1 });
        }}
        ListFooterComponent={
          cargandoMas ? <ActivityIndicator style={styles.pie} color={colors.primary} /> : null
        }
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.vacioTitulo}>Todavía no apareció nada</Text>
            <Text style={styles.vacioTexto}>
              Cuando alguien publique algo que coincida, lo vas a ver acá.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TarjetaResultado
            publicacion={item}
            onPress={() => navigation.navigate('DetallePublicacion', { id: item.id })}
            destacada={item.esNueva}
            pie={
              item.esNueva ? (
                <View style={styles.nueva}>
                  <IndicadorNovedad />
                  <Text style={styles.nuevaTexto}>Nueva desde la última vez</Text>
                </View>
              ) : null
            }
          />
        )}
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
    padding: spacing.xl,
  },
  resumen: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  resumenTexto: {
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  resumenTotal: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  aviso: {
    paddingHorizontal: spacing.lg,
  },
  lista: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
  },
  pie: {
    marginVertical: spacing.lg,
  },
  nueva: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  nuevaTexto: {
    fontSize: fontSizes.xs,
    color: colors.danger,
    fontWeight: 'bold',
  },
  vacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  vacioTitulo: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  vacioTexto: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
