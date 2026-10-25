// Botón de la app. Componente puro.
//
// Mientras está `cargando` muestra un spinner y no se puede tocar: sin eso,
// tocar dos veces manda dos pedidos y en un registro eso significa dos
// códigos OTP (y el segundo rebota por el cooldown).
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, fontSizes, radius, spacing } from '../config/theme';

export default function Boton({
  titulo,
  onPress,
  cargando = false,
  deshabilitado = false,
  variante = 'primario',
}) {
  const inactivo = cargando || deshabilitado;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variante === 'primario' ? styles.primario : styles.secundario,
        inactivo ? styles.inactivo : null,
      ]}
      onPress={onPress}
      disabled={inactivo}
      activeOpacity={0.8}
    >
      {cargando ? (
        <ActivityIndicator
          color={variante === 'primario' ? colors.white : colors.primary}
        />
      ) : (
        <Text
          style={[
            styles.texto,
            variante === 'primario' ? styles.textoPrimario : styles.textoSecundario,
          ]}
        >
          {titulo}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primario: {
    backgroundColor: colors.primary,
  },
  secundario: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  // Atenuado en vez de invisible: se ve que el botón está ahí pero que
  // ahora no se puede usar.
  inactivo: {
    opacity: 0.5,
  },
  texto: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  textoPrimario: {
    color: colors.white,
  },
  textoSecundario: {
    color: colors.primary,
  },
});
