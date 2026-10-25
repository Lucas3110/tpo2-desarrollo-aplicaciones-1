// Punto 1: todo lo que la app le pide al backend sobre la cuenta.
//
// JavaScript puro, sin JSX: son funciones que envuelven los endpoints. Las
// pantallas las llaman y no saben nada de axios ni de rutas.
//
// Todas salen por apiClient, que es el único cliente con interceptores. Si
// alguna creara su propio axios.create(), los pedidos saldrían sin token.
import apiClient from './apiClient';

// POST /auth/registro/solicitar
//
// Paso 1 del registro: solo el email. El backend crea la cuenta sin
// contraseña y manda el código. Llamarla otra vez con el mismo email es el
// "reenviar": el backend invalida el código anterior y manda uno nuevo
// (con un cooldown de unos segundos en el medio).
//
// Devuelve { mensaje, codigoDesarrollo }. codigoDesarrollo solo viene si el
// backend está con OTP_EXPOSE_IN_RESPONSE=true, que es como lo corremos en
// desarrollo para no tener que abrir el mail.
export async function solicitarRegistro(email) {
  const { data } = await apiClient.post('/auth/registro/solicitar', { email });
  return data;
}

// POST /auth/registro/confirmar
//
// Paso 2: el código más el nombre y la contraseña. Si sale bien devuelve
// { token, usuario } y la sesión queda abierta, así no hay que loguearse
// justo después de registrarse.
//
// El backend valida el nombre y la contraseña ANTES de consumir el código,
// así que si alguno está mal el código sigue sirviendo y se puede corregir
// sin pedir otro.
export async function confirmarRegistro({ email, codigo, nombre, password }) {
  const { data } = await apiClient.post('/auth/registro/confirmar', {
    email,
    codigo,
    nombre,
    password,
  });
  return data;
}

// POST /auth/login
//
// Ingreso con email y contrasena. Devuelve { token, usuario }.
//
// El backend contesta el mismo mensaje generico cuando el email no existe y
// cuando la contrasena esta mal, asi nadie puede averiguar que emails tienen
// cuenta probando de a uno. Por eso la pantalla muestra el mensaje tal cual
// viene y no intenta adivinar que campo fue.
//
// Caso aparte: si la cuenta existe pero nunca confirmo el email, el backend
// devuelve 403 con el codigo EMAIL_NO_VERIFICADO. Ahi si conviene ofrecerle
// volver al registro en vez de dejarla trabada.
export async function login({ email, password }) {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data;
}

// GET /auth/me
//
// Trae el usuario de la sesion guardada. Sirve para refrescar los datos al
// arrancar: si el perfil cambio desde otro lado, lo que tenemos guardado
// quedo viejo. Si el token vencio, esto contesta 401.
export async function obtenerPerfil() {
  const { data } = await apiClient.get('/auth/me');
  return data;
}

// POST /auth/password/recuperar
//
// Manda un codigo al email para poder definir una contrasena nueva. Llamarla
// otra vez es el "reenviar" que pide el enunciado: el backend invalida el
// codigo anterior y manda uno nuevo, con un cooldown de unos segundos.
//
// Importante: contesta 200 exista o no el email. Es a proposito, para que
// nadie pueda averiguar quien tiene cuenta. O sea que un 200 NO garantiza
// que el mail salio, y la pantalla no puede decirle "te lo mandamos" como si
// fuera un hecho.
export async function recuperarPassword(email) {
  const { data } = await apiClient.post('/auth/password/recuperar', { email });
  return data;
}

// POST /auth/password/restablecer
//
// Con el codigo correcto define la contrasena nueva y devuelve
// { token, usuario }: la sesion queda abierta, asi no hay que loguearse justo
// despues de elegir la contrasena.
//
// El backend valida la contrasena ANTES de consumir el codigo, asi que si es
// corta el codigo sigue sirviendo.
export async function restablecerPassword({ email, codigo, password }) {
  const { data } = await apiClient.post('/auth/password/restablecer', {
    email,
    codigo,
    password,
  });
  return data;
}
