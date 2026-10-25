// Punto 5: elegir fotos de la galería y subirlas.
//
// Alcance: SÓLO galería, no cámara. En la clase 4 el profe dijo textual que
// donde el enunciado habla de sacar fotos lo omitamos, que van de la galería,
// y que lo de cámara entra en una entrega posterior.
import * as ImagePicker from 'expo-image-picker';
import apiClient from './apiClient';

// Qué tan grande y con qué calidad pedimos la imagen.
//
// El backend acepta hasta 4 MB ya decodificados, pero el límite real no es
// ese: la foto viaja en base64 adentro del JSON, y el base64 infla un 33%.
// Con calidad 0.6 una foto de celular queda en unos 300 KB, que sube rápido
// incluso con mala señal y se ve perfecta en una pantalla de teléfono.
const CALIDAD = 0.6;

export const MAX_FOTOS = 8;

// Devuelve las imágenes elegidas, o [] si la persona canceló.
//
// Lanza un Error con mensaje legible si no dio permiso: ese caso hay que
// contarlo, no tragarlo, porque si no parece que el botón está roto.
export async function elegirDeGaleria(cuantasFaltan) {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) {
    throw new Error(
      'Necesitamos permiso para ver tus fotos. Podés dárselo desde los ajustes del teléfono.'
    );
  }

  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: CALIDAD,
    base64: true,
    allowsMultipleSelection: true,
    selectionLimit: cuantasFaltan,
  });

  if (resultado.canceled) return [];
  return resultado.assets ?? [];
}

// POST /hallado/fotos
//
// Manda la imagen en base64 y recibe la URL relativa con la que queda
// guardada. Esa url es la que después va en el campo fotos de la publicación.
export async function subirFoto(asset) {
  if (!asset.base64) {
    // No debería pasar porque pedimos base64: true, pero si el picker lo
    // devuelve vacío es mejor decirlo que mandar un pedido vacío.
    throw new Error('No pudimos leer esa imagen, probá con otra.');
  }

  const { data } = await apiClient.post('/hallado/fotos', {
    base64: asset.base64,
    mime: asset.mimeType ?? 'image/jpeg',
  });
  return data.url;
}

// Sube varias y devuelve { urls, fallidas }.
//
// Se suben de a una y no con Promise.all a propósito: con ocho fotos de
// 300 KB en paralelo, una conexión de celular se tapa y empiezan a dar
// timeout todas juntas. De a una tarda un poco más y no falla ninguna.
//
// Y si una falla, no se pierden las que ya subieron: se devuelven igual y la
// pantalla avisa cuáles quedaron afuera.
export async function subirFotos(assets, alProgresar) {
  const urls = [];
  const fallidas = [];

  for (let i = 0; i < assets.length; i += 1) {
    if (alProgresar) alProgresar(i + 1, assets.length);
    try {
      urls.push(await subirFoto(assets[i]));
    } catch (e) {
      fallidas.push(e.message);
    }
  }

  return { urls, fallidas };
}
