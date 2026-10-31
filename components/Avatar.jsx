// Foto de perfil redonda. Componente puro.
//
// Si la persona no cargó foto, o la foto no carga, muestra sus iniciales:
// un círculo vacío parece un error, las iniciales parecen una decisión.
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { urlDeFoto } from '../services/publicacionService';
import { colors } from '../config/theme';

function iniciales(nombre) {
  return String(nombre ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');
}

export default function Avatar({ nombre, fotoUrl, tamano = 88 }) {
  // Si la url quedó rota (por ejemplo, el archivo se borró del backend) se
  // vuelve a las iniciales en vez de dejar el círculo en blanco.
  const [fallo, setFallo] = useState(false);
  const circulo = { width: tamano, height: tamano, borderRadius: tamano / 2 };

  if (fotoUrl && !fallo) {
    return (
      <Image
        source={{ uri: urlDeFoto(fotoUrl) }}
        style={[styles.foto, circulo]}
        onError={() => setFallo(true)}
      />
    );
  }

  return (
    <View style={[styles.sinFoto, circulo]}>
      <Text style={[styles.iniciales, { fontSize: tamano * 0.36 }]}>{iniciales(nombre)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  foto: {
    backgroundColor: colors.border,
  },
  sinFoto: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciales: {
    color: colors.white,
    fontWeight: 'bold',
  },
});
