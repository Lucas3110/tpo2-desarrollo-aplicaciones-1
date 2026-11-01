// Preferencias de la persona que no son secretas: van en AsyncStorage, no en
// SecureStore. Acá no hay nada que cifrar — que la biometría esté activada o
// no no le sirve a nadie.
//
// Igual que sesionStorage, este archivo es el único que conoce las claves.
//
// ---------------------------------------------------------------
// Por qué la clave lleva el id del usuario
// ---------------------------------------------------------------
//
// Antes era una sola clave para todo el teléfono, y eso mezclaba cuentas:
// alguien activaba la huella, cerraba sesión, entraba con otra cuenta y esa
// cuenta aparecía con la huella ya activada sin haberla tocado nunca.
//
// No es sólo raro: la segunda persona queda con la sesión bloqueada por una
// decisión que tomó otra, y si su huella no está entre las del dispositivo
// no puede entrar más que por "Ingresar con mi contraseña".
//
// Con el id adentro de la clave, cada cuenta arranca con la preferencia en
// su valor por defecto, que es desactivada. Mismo criterio que el historial
// de búsquedas del punto 3.
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIJO_BIOMETRIA = 'hallado.biometriaActivada.';

function claveBiometria(usuarioId) {
  return `${PREFIJO_BIOMETRIA}${usuarioId}`;
}

export async function leerBiometriaActivada(usuarioId) {
  // Sin usuario no hay preferencia que leer: todavía no sabemos de quién.
  if (!usuarioId) return false;

  try {
    return (await AsyncStorage.getItem(claveBiometria(usuarioId))) === '1';
  } catch {
    // Si el storage falla, lo tratamos como desactivada. Es la opción segura:
    // peor sería quedar bloqueado sin poder entrar.
    return false;
  }
}

export async function guardarBiometriaActivada(usuarioId, activada) {
  if (!usuarioId) return;

  try {
    await AsyncStorage.setItem(claveBiometria(usuarioId), activada ? '1' : '0');
  } catch {
    // Si no se pudo guardar, la preferencia no sobrevive al cierre de la app.
    // No vale tirar la pantalla abajo por esto.
  }
}
