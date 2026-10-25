// Validaciones de los formularios.
//
// Repiten las reglas del backend a propósito. El backend valida igual y es el
// que manda: estas son para avisarle a la persona antes de hacer el pedido, en
// vez de esperar un 400. Si alguna vez se cambia una regla, hay que cambiarla
// en los dos lados.
//
// Devuelven el mensaje de error, o null si está todo bien. Así la pantalla
// hace `const error = validarEmail(email)` y listo.

const NOMBRE_MAX = 30;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 40;
const LARGO_CODIGO = 6;

// Letras (con acentos y ñ), espacios, apóstrofos y guiones. Arranca con letra.
const FORMATO_NOMBRE = /^\p{L}[\p{L} '’-]*$/u;
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarEmail(email) {
  const valor = String(email ?? '').trim();
  if (valor === '') return 'Escribí tu email';
  if (!FORMATO_EMAIL.test(valor)) return 'Ese email no parece válido';
  return null;
}

export function validarNombre(nombre) {
  const valor = String(nombre ?? '').trim();
  if (valor === '') return 'Escribí tu nombre';
  if (valor.length > NOMBRE_MAX) return `Hasta ${NOMBRE_MAX} caracteres`;
  if (/\d/.test(valor)) return 'El nombre no puede tener números';
  if (!FORMATO_NOMBRE.test(valor)) return 'Solo letras, espacios, apóstrofos y guiones';
  return null;
}

export function validarPassword(password) {
  const valor = String(password ?? '');
  if (valor === '') return 'Elegí una contraseña';
  if (valor.length < PASSWORD_MIN) return `Al menos ${PASSWORD_MIN} caracteres`;
  if (valor.length > PASSWORD_MAX) return `Hasta ${PASSWORD_MAX} caracteres`;
  return null;
}

export function validarRepeticionPassword(password, repeticion) {
  if (String(repeticion ?? '') === '') return 'Repetí la contraseña';
  if (password !== repeticion) return 'Las contraseñas no coinciden';
  return null;
}

export function validarCodigo(codigo) {
  const valor = String(codigo ?? '').trim();
  if (valor === '') return 'Escribí el código que te llegó';
  if (!/^\d+$/.test(valor)) return 'El código son solo números';
  if (valor.length !== LARGO_CODIGO) return `El código tiene ${LARGO_CODIGO} números`;
  return null;
}

// Corre varias validaciones y devuelve un objeto { campo: mensaje } con las
// que fallaron. Si no falló ninguna devuelve un objeto vacío, así la pantalla
// hace `Object.keys(errores).length === 0`.
export function validarFormulario(reglas) {
  const errores = {};
  for (const [campo, mensaje] of Object.entries(reglas)) {
    if (mensaje !== null) errores[campo] = mensaje;
  }
  return errores;
}

export const LIMITES = { NOMBRE_MAX, PASSWORD_MIN, PASSWORD_MAX, LARGO_CODIGO };
