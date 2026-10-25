// Punto 5: "Si la persona interrumpe la carga y sale de la app, al volver
// encuentra el borrador conservado para retomarlo donde lo dejó."
//
// Por qué local y no en el backend
// --------------------------------
// El escenario del enunciado es "sale de la app y vuelve", que es local. Y
// hay una razón más fuerte: el punto 6 pide poder crear una publicación sin
// conexión. Un borrador que necesita internet para guardarse no sirve
// justamente cuando más se lo necesita.
//
// Va en AsyncStorage y no en SecureStore: no hay nada secreto en un borrador,
// y SecureStore tiene un límite de tamaño chico que un borrador con varias
// URLs de fotos podría rozar.
//
// Un borrador por persona. Si alguien cambia de cuenta en el mismo teléfono
// no tiene por qué encontrarse el borrador del otro, así que la clave lleva
// el id del usuario.
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIJO = 'hallado.borrador.';

// Después de una semana, un borrador ya no describe lo que la persona quería
// publicar: o lo publicó por otro lado o se olvidó. Ofrecerle retomar algo
// de hace un mes es más molesto que útil.
const VENCIMIENTO_MS = 7 * 24 * 60 * 60 * 1000;

function clave(usuarioId) {
  return `${PREFIJO}${usuarioId}`;
}

export async function guardarBorrador(usuarioId, datos) {
  try {
    await AsyncStorage.setItem(
      clave(usuarioId),
      JSON.stringify({ guardadoEn: Date.now(), datos })
    );
  } catch {
    // Que no se pueda guardar el borrador no puede tirar abajo el formulario:
    // la persona sigue cargando igual, solo que sin red de contención.
  }
}

// Devuelve los datos guardados, o null si no hay o si ya vencieron.
export async function leerBorrador(usuarioId) {
  try {
    const crudo = await AsyncStorage.getItem(clave(usuarioId));
    if (!crudo) return null;

    const { guardadoEn, datos } = JSON.parse(crudo);

    if (Date.now() - guardadoEn > VENCIMIENTO_MS) {
      await borrarBorrador(usuarioId);
      return null;
    }

    return { guardadoEn, datos };
  } catch {
    // JSON roto o storage que falla: lo tratamos como si no hubiera borrador.
    return null;
  }
}

export async function borrarBorrador(usuarioId) {
  try {
    await AsyncStorage.removeItem(clave(usuarioId));
  } catch {
    // idem
  }
}

// ¿Vale la pena guardar esto? Un formulario donde sólo se eligió el tipo no
// es un borrador: es alguien que entró y salió. Guardarlo haría que al
// volver a entrar aparezca un cartel de "tenés algo a medio cargar" por
// nada.
export function valeLaPenaGuardar(datos) {
  if (!datos) return false;
  return (
    String(datos.titulo ?? '').trim() !== '' ||
    String(datos.descripcion ?? '').trim() !== '' ||
    String(datos.direccion ?? '').trim() !== '' ||
    (datos.fotos ?? []).length > 0 ||
    datos.categoriaId !== null ||
    datos.barrioId !== null
  );
}

// Un resumen corto para el cartel que ofrece retomarlo.
export function describirBorrador(datos) {
  const titulo = String(datos?.titulo ?? '').trim();
  if (titulo !== '') return titulo;
  if (datos?.tipo === 'PERDI') return 'algo que perdiste';
  if (datos?.tipo === 'ENCONTRE') return 'algo que encontraste';
  return 'una publicación';
}
