// La reputación y las insignias de una persona. Componente puro.
//
// "La reputación se construye a partir de las devoluciones concretadas y de
// las valoraciones recibidas (positivas o negativas)." Se muestran esos
// números tal cual, sin promediarlos en un puntaje: "4 devoluciones, 6
// positivas, 1 negativa" dice más que un 4,2 que nadie sabe de dónde sale.
//
// Las insignias vienen todas del backend, con su progreso. En el perfil
// propio se muestran también las que faltan ("3 de 5"), que es lo que
// motiva a seguir; en el público, sólo las obtenidas.
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radius, spacing } from '../config/theme';

export default function ReputacionPerfil({ reputacion, insignias, mostrarPendientes = false }) {
  const obtenidas = insignias.filter((i) => i.obtenida);
  const pendientes = mostrarPendientes ? insignias.filter((i) => !i.obtenida) : [];

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

      <Text style={styles.subtitulo}>Insignias</Text>
      {obtenidas.length === 0 && pendientes.length === 0 ? (
        <Text style={styles.nota}>Todavía no tiene insignias.</Text>
      ) : null}

      {obtenidas.map((insignia) => (
        <View key={insignia.codigo} style={[styles.insignia, styles.obtenida]}>
          <Text style={styles.insigniaNombre}>★ {insignia.nombre}</Text>
          <Text style={styles.insigniaDescripcion}>{insignia.descripcion}</Text>
        </View>
      ))}

      {pendientes.map((insignia) => (
        <View key={insignia.codigo} style={styles.insignia}>
          <View style={styles.filaPendiente}>
            <Text style={[styles.insigniaNombre, styles.textoPendiente]}>{insignia.nombre}</Text>
            <Text style={styles.progresoTexto}>
              {insignia.progreso.actual} de {insignia.progreso.meta}
            </Text>
          </View>
          <Text style={styles.insigniaDescripcion}>{insignia.descripcion}</Text>
          <View style={styles.barra}>
            <View
              style={[
                styles.barraRelleno,
                { width: `${(insignia.progreso.actual / insignia.progreso.meta) * 100}%` },
              ]}
            />
          </View>
        </View>
      ))}
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
  subtitulo: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  insignia: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  obtenida: {
    borderColor: colors.primary,
    backgroundColor: '#E8F3EE',
  },
  insigniaNombre: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.primaryDark,
  },
  textoPendiente: {
    color: colors.textSecondary,
  },
  insigniaDescripcion: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  filaPendiente: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progresoTexto: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  barra: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  barraRelleno: {
    height: '100%',
    backgroundColor: colors.primary,
  },
});
