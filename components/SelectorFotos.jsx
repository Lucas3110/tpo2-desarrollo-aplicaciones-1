// Grilla de fotos con botón para agregar desde la galería.
//
// Las fotos se suben APENAS se eligen, no al publicar. Dos razones:
// la persona ve enseguida si entraron bien, y al momento de tocar "Publicar"
// no hay que esperar ocho subidas con el formulario entero en juego.
//
// Trabaja con las URLs que ya devolvió el backend, así que el padre guarda
// una lista de strings y nada más.
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Aviso from './Aviso';
import { elegirDeGaleria, MAX_FOTOS, subirFotos } from '../services/fotoService';
import { urlDeFoto } from '../services/publicacionService';
import { colors, fontSizes, radius, spacing } from '../config/theme';

export default function SelectorFotos({ urls, onCambiar }) {
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(null);
  const [error, setError] = useState(null);

  const faltan = MAX_FOTOS - urls.length;

  const agregar = async () => {
    setError(null);
    try {
      const elegidas = await elegirDeGaleria(faltan);
      if (elegidas.length === 0) return;

      setSubiendo(true);
      const { urls: nuevas, fallidas } = await subirFotos(elegidas, (hecha, total) =>
        setProgreso(`Subiendo ${hecha} de ${total}…`)
      );

      if (nuevas.length > 0) onCambiar([...urls, ...nuevas]);
      if (fallidas.length > 0) {
        setError(
          fallidas.length === elegidas.length
            ? fallidas[0]
            : `${fallidas.length} de ${elegidas.length} no se pudieron subir.`
        );
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubiendo(false);
      setProgreso(null);
    }
  };

  const quitar = (url) => {
    setError(null);
    onCambiar(urls.filter((u) => u !== url));
  };

  return (
    <View style={styles.contenedor}>
      <Aviso mensaje={error} />

      <View style={styles.grilla}>
        {urls.map((url, indice) => (
          <View key={url} style={styles.celda}>
            <Image source={{ uri: urlDeFoto(url) }} style={styles.foto} />

            {/* La primera es la portada: es la que se ve en el listado del
                punto 3, así que conviene que se sepa cuál es. */}
            {indice === 0 ? (
              <View style={styles.portada}>
                <Text style={styles.portadaTexto}>Portada</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.quitar}
              onPress={() => quitar(url)}
              hitSlop={8}
              activeOpacity={0.8}
            >
              <Text style={styles.quitarTexto}>×</Text>
            </TouchableOpacity>
          </View>
        ))}

        {faltan > 0 ? (
          <TouchableOpacity
            style={[styles.celda, styles.agregar]}
            onPress={agregar}
            disabled={subiendo}
            activeOpacity={0.7}
          >
            {subiendo ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Text style={styles.agregarSigno}>+</Text>
                <Text style={styles.agregarTexto}>Agregar</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.pie}>
        {progreso ??
          (urls.length === 0
            ? `Elegí hasta ${MAX_FOTOS} fotos de tu galería`
            : `${urls.length} de ${MAX_FOTOS}. La primera es la portada.`)}
      </Text>
    </View>
  );
}

const TAMANIO = 104;

const styles = StyleSheet.create({
  contenedor: {
    width: '100%',
    marginBottom: spacing.md,
  },
  grilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  celda: {
    width: TAMANIO,
    height: TAMANIO,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  foto: {
    width: '100%',
    height: '100%',
  },
  portada: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 2,
  },
  portadaTexto: {
    color: colors.white,
    fontSize: fontSizes.xs,
    textAlign: 'center',
  },
  quitar: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quitarTexto: {
    color: colors.white,
    fontSize: 18,
    lineHeight: 20,
    fontWeight: 'bold',
  },
  agregar: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agregarSigno: {
    fontSize: 28,
    color: colors.primary,
    lineHeight: 32,
  },
  agregarTexto: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  pie: {
    marginTop: spacing.sm,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
});
