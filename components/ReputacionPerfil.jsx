// La reputación de una persona. Componente puro.
//
// "La reputación se construye a partir de las devoluciones concretadas y de
// las valoraciones recibidas (positivas o negativas)." Se muestran esos
// números tal cual, sin promediarlos en un puntaje: "4 devoluciones, 6
// positivas, 1 negativa" dice más que un 4,2 que nadie sabe de dónde sale.
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, spacing } from '../config/theme';

export default function ReputacionPerfil({ reputacion }) {
  return (
    <View>
      <View style={styles.numeros}>
        <Numero valor={reputacion.devoluciones} etiqueta="Devoluciones" />
        <Numero valor={reputacion.valoracionesPositivas} etiqueta="Positivas" color={colors.success} />
        <Numero valor={reputacion.valoracionesNegativas} etiqueta="Negativas" color={colors.danger} />
      </View>
      <Text style={styles.nota}>
        {reputacion.recuperos === 1
          ? 'Recuperó 1 objeto'
          : `Recuperó ${reputacion.recuperos} objetos`}
        {' · '}
        {reputacion.agradecimientos === 1
          ? '1 agradecimiento'
          : `${reputacion.agradecimientos} agradecimientos`}
      </Text>
    </View>
  );
}

function Numero({ valor, etiqueta, color = colors.text }) {
  return (
    <View style={styles.numero}>
      <Text style={[styles.numeroValor, { color }]}>{valor}</Text>
      <Text style={styles.numeroEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  numeros: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  numero: {
    alignItems: 'center',
  },
  numeroValor: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
  },
  numeroEtiqueta: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  nota: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
