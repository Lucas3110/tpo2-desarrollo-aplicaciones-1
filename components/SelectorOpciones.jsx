// Selector de pocas opciones, como fichas que se tocan.
//
// Para 2 a 6 opciones esto es mejor que un desplegable: se ven todas de una,
// se eligen con un toque y no hace falta sumar ninguna librería (React Native
// no trae Picker, viene aparte).
//
// Componente puro: recibe las opciones y qué está elegido, y avisa.
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontSizes, radius, spacing } from '../config/theme';

export default function SelectorOpciones({
  etiqueta,
  opciones,
  valor,
  onElegir,
  error,
  columnas = false,
}) {
  return (
    <View style={styles.contenedor}>
      {etiqueta ? <Text style={styles.etiqueta}>{etiqueta}</Text> : null}

      <View style={columnas ? styles.columna : styles.fila}>
        {opciones.map((opcion) => {
          const elegida = opcion.valor === valor;
          return (
            <TouchableOpacity
              key={String(opcion.valor)}
              style={[
                styles.ficha,
                columnas ? styles.fichaAncha : null,
                elegida ? styles.fichaElegida : null,
              ]}
              onPress={() => onElegir(opcion.valor)}
              activeOpacity={0.7}
            >
              <Text style={[styles.texto, elegida ? styles.textoElegido : null]}>
                {opcion.etiqueta}
              </Text>
              {opcion.ayuda ? (
                <Text style={[styles.ayuda, elegida ? styles.ayudaElegida : null]}>
                  {opcion.ayuda}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
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
    marginBottom: spacing.sm,
  },
  fila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  columna: {
    gap: spacing.sm,
  },
  ficha: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  fichaAncha: {
    width: '100%',
  },
  fichaElegida: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  texto: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  textoElegido: {
    color: colors.white,
    fontWeight: 'bold',
  },
  ayuda: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  ayudaElegida: {
    color: colors.white,
    opacity: 0.85,
  },
  error: {
    marginTop: spacing.xs,
    fontSize: fontSizes.xs,
    color: colors.danger,
  },
});
