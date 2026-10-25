// Cartel de error o de confirmación. Componente puro.
//
// Va arriba del formulario y no como alert(): un alert hay que cerrarlo antes
// de poder corregir el campo, y el mensaje desaparece justo cuando lo
// necesitás leer.
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radius, spacing } from '../config/theme';

export default function Aviso({ mensaje, tipo = 'error' }) {
  if (!mensaje) return null;

  return (
    <View style={[styles.contenedor, estilosPorTipo[tipo].caja]}>
      <Text style={[styles.texto, estilosPorTipo[tipo].texto]}>{mensaje}</Text>
    </View>
  );
}

// Objeto común, no StyleSheet.create: este mapa está anidado por tipo y
// StyleSheet.create espera estilos planos.
const estilosPorTipo = {
  error: {
    caja: { backgroundColor: '#FDECEA', borderColor: colors.danger },
    texto: { color: colors.danger },
  },
  exito: {
    caja: { backgroundColor: '#E8F5E9', borderColor: colors.success },
    texto: { color: colors.success },
  },
  info: {
    caja: { backgroundColor: '#FFF8E1', borderColor: colors.warning },
    texto: { color: '#8D6E00' },
  },
};

const styles = StyleSheet.create({
  contenedor: {
    width: '100%',
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  texto: {
    fontSize: fontSizes.sm,
  },
});
