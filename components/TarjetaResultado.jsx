// Una publicación en la lista de resultados.
//
// El enunciado dice qué tiene que mostrar: "cada publicación muestra título,
// categoría, barrio, fecha del suceso, coordenadas junto a las fotos".
//
// Las coordenadas se muestran como distancia ("a 1,2 km") cuando la persona
// compartió su ubicación, y como par de números cuando no. Un par de números
// sueltos no le dice nada a nadie; la distancia sí.
//
// `pie` es algo más que la pantalla quiera mostrar abajo de los datos (las
// seguidas del punto 9 ponen el estado de la publicación). `destacada`
// marca la tarjeta cuando tiene una novedad (punto 9).
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { urlDeFoto } from '../services/publicacionService';
import { describirFecha } from '../utils/fechas';
import { colors, fontSizes, radius, spacing } from '../config/theme';

export default function TarjetaResultado({ publicacion, onPress, pie = null, destacada = false }) {
  const { titulo, categoria, barrio, fechaSuceso, coordenadas, distanciaKm, fotos } = publicacion;
  const portada = fotos.length > 0 ? fotos[0].url : null;

  return (
    <TouchableOpacity
      style={[styles.tarjeta, destacada ? styles.destacada : null]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {portada ? (
        <Image source={{ uri: urlDeFoto(portada) }} style={styles.foto} />
      ) : (
        <View style={[styles.foto, styles.sinFoto]}>
          <Text style={styles.sinFotoTexto}>Sin{'\n'}foto</Text>
        </View>
      )}

      <View style={styles.datos}>
        <Text style={styles.titulo} numberOfLines={2}>
          {titulo}
        </Text>

        <Text style={styles.detalle}>
          {categoria.nombre} · {barrio.nombre}
        </Text>

        <Text style={styles.detalle}>{describirFecha(fechaSuceso)}</Text>

        {distanciaKm !== null && distanciaKm !== undefined ? (
          <Text style={styles.distancia}>a {formatearDistancia(distanciaKm)}</Text>
        ) : coordenadas ? (
          <Text style={styles.coordenadas}>
            {coordenadas.lat.toFixed(4)}, {coordenadas.lng.toFixed(4)}
          </Text>
        ) : null}

        {fotos.length > 1 ? (
          <Text style={styles.masFotos}>
            {fotos.length} fotos
          </Text>
        ) : null}

        {pie}
      </View>
    </TouchableOpacity>
  );
}

// Menos de un kilómetro se lee mejor en metros, y redondeado: "a 847 m" es
// una precisión que el GPS no tiene y que a nadie le sirve.
function formatearDistancia(km) {
  if (km < 1) return `${Math.round((km * 1000) / 50) * 50} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

const styles = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  destacada: {
    borderColor: colors.danger,
    borderLeftWidth: 4,
  },
  foto: {
    width: 88,
    height: 88,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  sinFoto: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sinFotoTexto: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  datos: {
    flex: 1,
  },
  titulo: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  detalle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  distancia: {
    fontSize: fontSizes.xs,
    color: colors.primary,
    fontWeight: 'bold',
    marginTop: spacing.xs,
  },
  coordenadas: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  masFotos: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
