// Punto 6: copia local de las listas personales (Mis reclamos, Mis alertas,
// Seguidas) para poder mostrarlas sin conexión.
//
// Cada vez que la lista carga bien con internet se guarda la respuesta del
// servidor tal cual. Si después no hay conexión, se muestra esa última copia
// con un aviso de que puede estar desactualizada, en vez de dejar la pantalla
// vacía con un cartel de error.
//
// Va en AsyncStorage (igual que los catálogos y el borrador) igual que
// la caché de publicaciones de `offlineSyncService`: son respuestas completas del
// servidor que solo se leen enteras.
//
// La clave lleva el id del usuario, y `borrarCopiasLocales` se llama al abrir y
// cerrar sesión (desde `limpiarCacheLectura`): son datos personales y no tienen
// que verlos otras personas que usen el mismo teléfono.
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIJO = 'hallado.copia.';

function clave(usuarioId, nombre) {
  return `${PREFIJO}${usuarioId}.${nombre}`;
}

// Pide `pedir()`; si anda, guarda la copia y la devuelve. Si falla por falta de
// conexión y hay copia, devuelve la copia. Cualquier otro error (por ejemplo un
// 403 del servidor) se relanza: no es un problema de conexión y tapar esa
// respuesta con datos viejos escondería un error real.
//
// Devuelve { datos, desdeCopia }.
export async function conCopiaLocal(nombre, usuarioId, pedir) {
  try {
    const datos = await pedir();
    if (usuarioId) {
      AsyncStorage.setItem(
        clave(usuarioId, nombre),
        JSON.stringify({ guardadoEn: Date.now(), datos })
      ).catch(() => {
        // Que no se pueda guardar la copia no puede romper una carga que salió bien.
      });
    }
    return { datos, desdeCopia: false };
  } catch (e) {
    if (e.esDeConexion && usuarioId) {
      const guardada = await leerCopia(usuarioId, nombre);
      if (guardada) return { datos: guardada, desdeCopia: true };
    }
    throw e;
  }
}

async function leerCopia(usuarioId, nombre) {
  try {
    const crudo = await AsyncStorage.getItem(clave(usuarioId, nombre));
    if (!crudo) return null;
    return JSON.parse(crudo).datos ?? null;
  } catch {
    // JSON roto o storage que falla: es como no tener copia.
    return null;
  }
}

// Borra todas las copias de todas las cuentas.
export async function borrarCopiasLocales() {
  try {
    const claves = await AsyncStorage.getAllKeys();
    const propias = claves.filter((k) => k.startsWith(PREFIJO));
    if (propias.length > 0) await AsyncStorage.multiRemove(propias);
  } catch {
    // Si falla la limpieza no afecta la experiencia de la persona.
  }
}
