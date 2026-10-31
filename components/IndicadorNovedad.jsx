// El indicador de novedad del punto 9: un punto, o un globo con un número.
// Componente puro.
//
// "Ambas secciones muestran un indicador visual de novedad cuando aparece
// una publicación que coincide con una alerta o cuando una publicación
// seguida cambia de estado." Es el mismo en el menú y en las dos listas,
// así la persona aprende una sola vez qué significa.
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes } from '../config/theme';

export default function IndicadorNovedad({ cantidad = null }) {
  if (cantidad === null) return <View style={styles.punto} />;
  if (cantidad <= 0) return null;

  return (
    <View style={styles.globo}>
      {/* Más de 99 no entra en el globo, y la diferencia no le cambia nada
          a nadie: igual tiene que entrar a mirar. */}
      <Text style={styles.texto}>{cantidad > 99 ? '99+' : cantidad}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  punto: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  globo: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    color: colors.white,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
  },
});
