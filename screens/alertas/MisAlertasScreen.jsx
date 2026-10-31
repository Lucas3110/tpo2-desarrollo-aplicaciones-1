// Punto 9: 'Sección "Mis alertas" donde se pueden ver, pausar o eliminar
// las alertas, con la cantidad de publicaciones nuevas que coinciden con
// cada una.'
//
// Se vuelve a pedir cada vez que la pantalla toma foco: al volver de mirar
// lo que encontró una alerta, su contador ya tiene que haber bajado a cero.
//
// Las que tienen algo nuevo llevan el indicador de novedad y quedan
// marcadas, para que se encuentren sin leer tarjeta por tarjeta.
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Aviso from '../../components/Aviso';
import Boton from '../../components/Boton';
import IndicadorNovedad from '../../components/IndicadorNovedad';
import { cambiarEstadoAlerta, eliminarAlerta, misAlertas } from '../../services/alertaService';
import { describirAlerta } from '../../utils/publicaciones';
import { colors, fontSizes, radius, spacing } from '../../config/theme';

export default function MisAlertasScreen({ navigation }) {
  // null hasta la primera carga; [] si no tiene ninguna.
  const [alertas, setAlertas] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(null);
  // El id de la alerta que se está pausando o eliminando, para el spinner
  // de su tarjeta y para que no se pueda tocar dos veces.
  const [enCurso, setEnCurso] = useState(null);
  const yaCargo = useRef(false);

  async function cargar({ esRefresco = false } = {}) {
    if (!yaCargo.current && !esRefresco) setCargando(true);
    setError(null);
    try {
      const respuesta = await misAlertas();
      setAlertas(respuesta.alertas);
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

  async function alternarPausa(alerta) {
    setEnCurso(alerta.id);
    setError(null);
    try {
      const actualizada = await cambiarEstadoAlerta(alerta.id, !alerta.activa);
      setAlertas((previas) => previas.map((a) => (a.id === actualizada.id ? actualizada : a)));
    } catch (e) {
      setError(e.message);
    } finally {
      setEnCurso(null);
    }
  }

  // Eliminar no se deshace, así que se confirma. Pausar no: se revierte con
  // el mismo botón.
  function confirmarEliminar(alerta) {
    Alert.alert(
      'Eliminar alerta',
      `"${describirAlerta(alerta)}" deja de avisarte. ¿La eliminamos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => eliminar(alerta) },
      ]
    );
  }

  async function eliminar(alerta) {
    setEnCurso(alerta.id);
    setError(null);
    try {
      await eliminarAlerta(alerta.id);
      setAlertas((previas) => previas.filter((a) => a.id !== alerta.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setEnCurso(null);
    }
  }

  if (cargando && alertas === null) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (alertas === null) {
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
        data={alertas}
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
            <Text style={styles.vacioTitulo}>Todavía no tenés alertas</Text>
            <Text style={styles.vacioTexto}>
              Hacé una búsqueda y tocá "Guardar alerta" en los resultados. Te vamos a mostrar acá
              lo que se publique de ahí en adelante.
            </Text>
            <View style={styles.vacioBoton}>
              <Boton titulo="Ir al buscador" onPress={() => navigation.navigate('Buscador')} />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TarjetaAlerta
            alerta={item}
            enCurso={enCurso === item.id}
            onPress={() => navigation.navigate('AlertaResultados', { id: item.id })}
            onPausar={() => alternarPausa(item)}
            onEliminar={() => confirmarEliminar(item)}
          />
        )}
      />
    </View>
  );
}

// ---------------------------------------------------------------

function TarjetaAlerta({ alerta, enCurso, onPress, onPausar, onEliminar }) {
  return (
    <View
      style={[
        styles.tarjeta,
        alerta.hayNovedad ? styles.tarjetaConNovedad : null,
        !alerta.activa ? styles.tarjetaPausada : null,
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <View style={styles.encabezado}>
          <Text style={styles.titulo}>{describirAlerta(alerta)}</Text>
          <IndicadorNovedad cantidad={alerta.nuevas} />
        </View>
        <Text style={[styles.detalle, alerta.hayNovedad ? styles.detalleConNovedad : null]}>
          {describirNuevas(alerta)}
        </Text>
      </TouchableOpacity>

      <View style={styles.acciones}>
        {enCurso ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <TouchableOpacity onPress={onPausar} hitSlop={8}>
              <Text style={styles.enlace}>{alerta.activa ? 'Pausar' : 'Reanudar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onEliminar} hitSlop={8}>
              <Text style={styles.enlacePeligro}>Eliminar</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

function describirNuevas(alerta) {
  if (!alerta.activa) return 'Pausada: no te avisa de lo nuevo';
  if (alerta.nuevas === 0) return 'Sin publicaciones nuevas';
  return alerta.nuevas === 1 ? '1 publicación nueva' : `${alerta.nuevas} publicaciones nuevas`;
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
  tarjeta: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  tarjetaConNovedad: {
    borderColor: colors.danger,
    borderLeftWidth: 4,
  },
  // Atenuada y no escondida: sigue siendo de la persona, sólo que callada.
  tarjetaPausada: {
    opacity: 0.6,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titulo: {
    flex: 1,
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
  },
  detalle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  detalleConNovedad: {
    color: colors.danger,
    fontWeight: 'bold',
  },
  acciones: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  enlace: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
  enlacePeligro: {
    color: colors.danger,
    fontSize: fontSizes.sm,
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
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  vacioTexto: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  vacioBoton: {
    width: '100%',
    marginTop: spacing.xl,
  },
});
