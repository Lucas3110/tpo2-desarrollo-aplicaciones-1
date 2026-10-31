// El botón "Menu" del header del buscador. Componente puro.
//
// Punto 9: el buscador es la pantalla de inicio, y el menú es por donde se
// llega a "Mis alertas" y "Seguidas". Si el indicador de novedad estuviera
// sólo adentro del menú, la persona tendría que abrirlo para enterarse de
// que hay algo. Por eso el botón también lleva el punto.
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../config/theme';

export default function BotonMenu({ onPress, hayNovedades = false }) {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={12} style={styles.boton}>
      <Text style={styles.texto}>Menu</Text>
      {hayNovedades ? <View style={styles.punto} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // El espacio de arriba y de la derecha es el lugar del punto. Tiene que
  // quedar adentro del botón: en Android el header recorta lo que se sale.
  boton: {
    paddingTop: 5,
    paddingRight: 9,
  },
  texto: {
    color: colors.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  punto: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
});
