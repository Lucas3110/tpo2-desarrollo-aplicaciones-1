// Input con etiqueta y mensaje de error. Componente puro: no sabe nada de
// negocio, recibe todo por props.
//
// Deja pasar el resto de las props al TextInput (`...resto`), así cada
// pantalla le pone lo que necesite: secureTextEntry, keyboardType, maxLength.
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fontSizes, radius, spacing } from '../config/theme';

export default function CampoTexto({ etiqueta, error, ayuda, style, ...resto }) {
  return (
    <View style={styles.contenedor}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>

      {/* `style` se saca de `resto` y se suma al final a propósito. Si viajara
          adentro del spread, reemplazaría al array entero y el campo perdería
          el borde, el fondo y el padding. Así se agrega encima. */}
      <TextInput
        style={[styles.input, error ? styles.inputConError : null, style]}
        placeholderTextColor={colors.textSecondary}
        {...resto}
      />

      {/* El error pisa a la ayuda: si hay algo mal, es lo que importa */}
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : ayuda ? (
        <Text style={styles.ayuda}>{ayuda}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    width: '100%',
    marginBottom: spacing.md,
  },
  etiqueta: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  inputConError: {
    borderColor: colors.danger,
  },
  error: {
    marginTop: spacing.xs,
    fontSize: fontSizes.xs,
    color: colors.danger,
  },
  ayuda: {
    marginTop: spacing.xs,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
});
