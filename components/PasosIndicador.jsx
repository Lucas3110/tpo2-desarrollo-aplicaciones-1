// Barrita de progreso del wizard: "Paso 2 de 4" con los puntos.
//
// El enunciado pide una "carga guiada en pasos". Mostrar en cuál va y
// cuántos faltan es lo que la hace guiada y no un formulario partido.
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, spacing } from '../config/theme';

export default function PasosIndicador({ paso, total, titulo }) {
  return (
    <View style={styles.contenedor}>
      <View style={styles.puntos}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[
              styles.punto,
              i < paso ? styles.puntoHecho : null,
              i === paso ? styles.puntoActual : null,
            ]}
          />
        ))}
      </View>
      <Text style={styles.contador}>
        Paso {paso + 1} de {total}
      </Text>
      <Text style={styles.titulo}>{titulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    marginBottom: spacing.lg,
  },
  puntos: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  punto: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  puntoHecho: {
    backgroundColor: colors.primary,
    opacity: 0.4,
  },
  puntoActual: {
    backgroundColor: colors.primary,
  },
  contador: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  titulo: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.xs,
  },
});
