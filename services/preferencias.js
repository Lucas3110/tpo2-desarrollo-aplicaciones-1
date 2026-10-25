// Preferencias de la persona que no son secretas: van en AsyncStorage, no en
// SecureStore. Acá no hay nada que cifrar — que la biometría esté activada o
// no no le sirve a nadie.
//
// Igual que sesionStorage, este archivo es el único que conoce las claves.
import AsyncStorage from '@react-native-async-storage/async-storage';

const CLAVE_BIOMETRIA = 'hallado.biometriaActivada';

export async function leerBiometriaActivada() {
  try {
    return (await AsyncStorage.getItem(CLAVE_BIOMETRIA)) === '1';
  } catch {
    // Si el storage falla, lo tratamos como desactivada. Es la opción segura:
    // peor sería quedar bloqueado sin poder entrar.
    return false;
  }
}

export async function guardarBiometriaActivada(activada) {
  try {
    await AsyncStorage.setItem(CLAVE_BIOMETRIA, activada ? '1' : '0');
  } catch {
    // Si no se pudo guardar, la preferencia no sobrevive al cierre de la app.
    // No vale tirar la pantalla abajo por esto.
  }
}
