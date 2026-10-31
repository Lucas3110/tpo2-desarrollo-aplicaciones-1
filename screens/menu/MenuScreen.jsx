// Las secciones de la app, fuera del buscador.
//
// El enunciado es explícito: "al ingresar a la app, la persona no ve un
// listado sino un buscador guiado". Así que la primera pantalla es sólo el
// buscador, y todo lo demás cuelga de acá, que se abre desde el header.
//
// Es una lista de enlaces y no una barra de pestañas a propósito: las
// pestañas necesitan @react-navigation/bottom-tabs, una librería más que el
// profe no dio, y para ocho secciones a las que se entra de vez en cuando
// una lista alcanza.
//
// Punto 9: "Mis alertas" y "Seguidas" llevan el indicador de novedad. Se
// pide cada vez que el menú toma foco, así al volver de mirar una alerta el
// globo ya bajó.
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Boton from '../../components/Boton';
import IndicadorNovedad from '../../components/IndicadorNovedad';
import { useAuth } from '../../hooks/useAuth';
import { obtenerNovedades } from '../../services/alertaService';
import { colors, fontSizes, radius, spacing } from '../../config/theme';

const SECCIONES = [
  {
    titulo: 'Publicar',
    items: [
      ['Publicar', 'Publicar una pérdida o un hallazgo', 5],
      ['MisPublicaciones', 'Mis publicaciones', 5],
    ],
  },
  {
    titulo: 'Devoluciones',
    items: [
      ['MisReclamos', 'Mis reclamos', 7],
      ['Historial', 'Historial', 10],
    ],
  },
  {
    titulo: 'Seguimiento',
    items: [
      ['MisAlertas', 'Mis alertas', 9],
      ['Seguidas', 'Publicaciones seguidas', 9],
    ],
  },
  {
    titulo: 'Mi cuenta',
    items: [
      ['Perfil', 'Mi perfil', 2],
      ['Configuracion', 'Configuración', 1],
    ],
  },
];

export default function MenuScreen({ navigation }) {
  const { usuario, cerrarSesion } = useAuth();
  const [novedades, setNovedades] = useState(null);

  useFocusEffect(
    useCallback(() => {
      obtenerNovedades()
        .then(setNovedades)
        // Sin el resumen el menú funciona igual, sólo que sin los globos.
        .catch(() => {});
    }, [])
  );

  // Cuántas cosas nuevas hay detrás de cada sección. En las alertas se
  // cuentan publicaciones, que es lo que la persona va a encontrar al entrar.
  const pendientesPorRuta = {
    MisAlertas: novedades?.alertas.publicacionesNuevas ?? 0,
    Seguidas: novedades?.seguidas.conNovedad ?? 0,
  };

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <TouchableOpacity
        style={styles.tarjetaCuenta}
        onPress={() => navigation.navigate('Perfil')}
        activeOpacity={0.7}
      >
        <Text style={styles.nombre}>{usuario?.nombre}</Text>
        <Text style={styles.email}>{usuario?.email}</Text>
        <Text style={styles.verPerfil}>Ver mi perfil</Text>
      </TouchableOpacity>

      {SECCIONES.map((seccion) => (
        <View key={seccion.titulo}>
          <Text style={styles.seccion}>{seccion.titulo}</Text>
          <View style={styles.grupo}>
            {seccion.items.map(([ruta, etiqueta]) => (
              <TouchableOpacity
                key={ruta}
                style={styles.item}
                onPress={() => navigation.navigate(ruta)}
                activeOpacity={0.7}
              >
                <Text style={styles.textoItem}>{etiqueta}</Text>
                <IndicadorNovedad cantidad={pendientesPorRuta[ruta] ?? 0} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.cerrar}>
        <Boton titulo="Cerrar sesión" onPress={cerrarSesion} variante="secundario" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  tarjetaCuenta: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  nombre: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
  },
  email: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  verPerfil: {
    fontSize: fontSizes.sm,
    color: colors.secondary,
    fontWeight: 'bold',
    marginTop: spacing.sm,
  },
  seccion: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  grupo: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  textoItem: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  cerrar: {
    marginTop: spacing.xl,
  },
});
