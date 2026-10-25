// Unico lugar que conoce las claves con las que guardamos la sesion.
// Si manana cambia el nombre de una clave, se cambia aca y listo.
//
// El token va en SecureStore (cifrado por el sistema operativo, el
// equivalente al EncryptedSharedPreferences de Android). Las preferencias
// que no son secretas van en AsyncStorage.
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CLAVE_TOKEN = 'hallado.token';
const CLAVE_USUARIO = 'hallado.usuario';

export async function guardarToken(token) {
  await SecureStore.setItemAsync(CLAVE_TOKEN, token);
}

export async function leerToken() {
  try {
    return await SecureStore.getItemAsync(CLAVE_TOKEN);
  } catch {
    // En un emulador recien creado o sin cifrado disponible puede fallar.
    // Preferimos arrancar sin sesion antes que reventar el arranque.
    return null;
  }
}

export async function borrarToken() {
  try {
    await SecureStore.deleteItemAsync(CLAVE_TOKEN);
  } catch {
    // Si no estaba, no hay nada que hacer.
  }
}

// El usuario no es secreto (nombre, email, barrio), asi que va en AsyncStorage.
// Lo guardamos para poder pintar la pantalla antes de que conteste /auth/me.
export async function guardarUsuario(usuario) {
  await AsyncStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
}

export async function leerUsuario() {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE_USUARIO);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

export async function borrarUsuario() {
  try {
    await AsyncStorage.removeItem(CLAVE_USUARIO);
  } catch {
    // idem
  }
}
