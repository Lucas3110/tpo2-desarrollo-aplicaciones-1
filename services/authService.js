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
