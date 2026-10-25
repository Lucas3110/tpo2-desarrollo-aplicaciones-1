// Pantalla de relleno para los destinos que todavia no implemento nadie.
//
// Sirve para que el navigator este completo desde el dia uno: si el punto 3
// necesita navegar al detalle (punto 4), puede hacerlo ya, y cuando el punto
// 4 se mergee solo se cambia el component en MainNavigator.
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, spacing } from '../config/theme';

export function pantallaPendiente(nombre, punto) {
  function Pendiente() {
    return (
      <View style={styles.contenedor}>
        <Text style={styles.titulo}>{nombre}</Text>
        <Text style={styles.detalle}>Punto {punto} - todavia sin implementar</Text>
      </View>
    );
  }
  // Para que React DevTools y los warnings muestren algo util.
  Pendiente.displayName = `Pendiente(${nombre})`;
  return Pendiente;
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  titulo: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  detalle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
