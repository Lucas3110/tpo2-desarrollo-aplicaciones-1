// Punto 9: 'Sección "Seguidas" con las publicaciones que la persona sigue.'
//
// Se siguen desde el detalle (punto 4). Esta lista se vuelve a pedir cada
// vez que toma foco: si la persona dejó de seguir algo desde el detalle, al
// volver ya no tiene que estar.
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Aviso from '../../components/Aviso';
import TarjetaResultado from '../../components/TarjetaResultado';
import { misSeguidas } from '../../services/publicacionService';
import { describirEstado } from '../../utils/publicaciones';
import { colors, fontSizes, spacing } from '../../config/theme';

export default function SeguidasScreen({ navigation }) {
  // null hasta la primera carga; [] si no sigue nada.
  const [seguidas, setSeguidas] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(null);
  const yaCargo = useRef(false);

  async function cargar({ esRefresco = false } = {}) {
    if (!yaCargo.current && !esRefresco) setCargando(true);
    setError(null);
    try {
      const respuesta = await misSeguidas();
      setSeguidas(respuesta.seguidas);
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

  if (cargando && seguidas === null) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (seguidas === null) {
    return (
      <View style={styles.centrado}>
        <Aviso mensaje={error} />
        <TouchableOpacity onPress={() => cargar()}>
          <Text style={styles.enlace}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.pantalla}>
      {error ? (
        <View style={styles.avisoError}>
          <Aviso mensaje={error} />
        </View>
      ) : null}

      <FlatList
        data={seguidas}
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
            <Text style={styles.vacioTitulo}>No seguís ninguna publicación</Text>
            <Text style={styles.vacioTexto}>
              Desde el detalle de una publicación podés tocar "Seguir esta publicación" para
              enterarte de sus novedades.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TarjetaResultado
            publicacion={item}
            onPress={() => navigation.navigate('DetallePublicacion', { id: item.id })}
            pie={<Estado seguida={item} />}
          />
        )}
      />
    </View>
  );
}

// ---------------------------------------------------------------

function Estado({ seguida }) {
  const estado = describirEstado(seguida.estado);
  return (
    <View style={[styles.chip, { backgroundColor: estado.color }]}>
      <Text style={styles.chipTexto}>{estado.texto}</Text>
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
  avisoError: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  lista: {
    padding: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
  },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.sm,
  },
  chipTexto: {
    color: colors.white,
    fontSize: fontSizes.xs,
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
