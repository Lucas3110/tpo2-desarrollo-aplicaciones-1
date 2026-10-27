// Galería del detalle: todas las fotos de la publicación, de a una.
//
// Se deslizan con paginado y un contador dice en cuál se está y cuántas hay.
// Tocar una la abre a pantalla completa, sobre fondo negro, porque en una
// foto de 4:3 recortada no se distingue si el llavero tiene dos llaves o
// tres, y ese detalle es justamente lo que hace falta ver para reclamar.
//
// Componente puro: recibe las fotos tal cual vienen del backend.
import { useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { urlDeFoto } from '../services/publicacionService';
import { colors, fontSizes, radius, spacing } from '../config/theme';

const ANCHO = Dimensions.get('window').width;
const ALTO = Math.round(ANCHO * 0.75);

export default function GaleriaFotos({ fotos }) {
  const [actual, setActual] = useState(0);
  const [ampliada, setAmpliada] = useState(false);

  if (!fotos || fotos.length === 0) {
    return (
      <View style={[styles.galeria, styles.sinFotos]}>
        <Text style={styles.sinFotosTexto}>Sin fotos</Text>
      </View>
    );
  }

  const indiceDesde = (evento) => Math.round(evento.nativeEvent.contentOffset.x / ANCHO);

  return (
    <View style={styles.galeria}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setActual(indiceDesde(e))}
      >
        {fotos.map((foto) => (
          <TouchableOpacity key={foto.id} activeOpacity={0.9} onPress={() => setAmpliada(true)}>
            <Image source={{ uri: urlDeFoto(foto.url) }} style={styles.foto} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {fotos.length > 1 ? (
        <>
          <View style={styles.contador}>
            <Text style={styles.contadorTexto}>
              {actual + 1} / {fotos.length}
            </Text>
          </View>
          <View style={styles.puntos}>
            {fotos.map((foto, i) => (
              <View key={foto.id} style={[styles.punto, i === actual ? styles.puntoActual : null]} />
            ))}
          </View>
        </>
      ) : null}

      {/* A pantalla completa. Arranca en la foto que se estaba mirando:
          abrir siempre la primera obligaría a volver a deslizar. */}
      <Modal visible={ampliada} animationType="fade" onRequestClose={() => setAmpliada(false)}>
        <View style={styles.pantallaCompleta}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: actual * ANCHO, y: 0 }}
            onMomentumScrollEnd={(e) => setActual(indiceDesde(e))}
          >
            {fotos.map((foto) => (
              <Image
                key={foto.id}
                source={{ uri: urlDeFoto(foto.url) }}
                style={styles.fotoCompleta}
                resizeMode="contain"
              />
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.cerrar} onPress={() => setAmpliada(false)} hitSlop={12}>
            <Text style={styles.cerrarTexto}>Cerrar</Text>
          </TouchableOpacity>

          {fotos.length > 1 ? (
            <View style={[styles.contador, styles.contadorCompleta]}>
              <Text style={styles.contadorTexto}>
                {actual + 1} / {fotos.length}
              </Text>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  galeria: {
    width: ANCHO,
    height: ALTO,
    backgroundColor: colors.border,
  },
  foto: {
    width: ANCHO,
    height: ALTO,
  },
  sinFotos: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sinFotosTexto: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
  },
  contador: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
  },
  contadorTexto: {
    color: colors.white,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
  },
  puntos: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.md + 4,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  punto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  puntoActual: {
    backgroundColor: colors.white,
  },
  pantallaCompleta: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  fotoCompleta: {
    width: ANCHO,
    height: '100%',
  },
  cerrar: {
    position: 'absolute',
    top: spacing.xl + spacing.md,
    right: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  cerrarTexto: {
    color: colors.white,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
  contadorCompleta: {
    bottom: spacing.xl + spacing.md,
    right: undefined,
    alignSelf: 'center',
  },
});
