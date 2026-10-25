// Placeholder de la pantalla inicial. El punto 3 la reemplaza por el
// buscador guiado (que te paso / que es / donde / cuando).
//
// Deja a mano los accesos al resto de la app para poder navegar y probar
// mientras cada punto se va construyendo.
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { colors, fontSizes, radius, spacing } from '../../config/theme';

const DESTINOS = [
  ['Resultados', 'Resultados de busqueda'],
  ['Publicar', 'Publicar una perdida o hallazgo'],
  ['MisPublicaciones', 'Mis publicaciones'],
  ['MisReclamos', 'Mis reclamos'],
  ['MisAlertas', 'Mis alertas'],
  ['Seguidas', 'Seguidas'],
  ['Historial', 'Historial'],
  ['Perfil', 'Mi perfil'],
  ['Configuracion', 'Configuracion'],
];

export default function BuscadorScreen({ navigation }) {
  const { usuario, cerrarSesion } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.contenedor}>
      <Text style={styles.saludo}>Hola, {usuario?.nombre ?? 'vecino'}</Text>
      <Text style={styles.nota}>Punto 3 - buscador guiado pendiente</Text>

      <View style={styles.lista}>
        {DESTINOS.map(([ruta, etiqueta]) => (
          <TouchableOpacity
            key={ruta}
            style={styles.item}
            onPress={() => navigation.navigate(ruta)}
            activeOpacity={0.7}
          >
            <Text style={styles.textoItem}>{etiqueta}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.botonSalir} onPress={cerrarSesion} activeOpacity={0.8}>
        <Text style={styles.textoSalir}>Cerrar sesion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  saludo: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  nota: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  lista: {
    gap: spacing.sm,
  },
  item: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  textoItem: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  botonSalir: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  textoSalir: {
    color: colors.danger,
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
});
