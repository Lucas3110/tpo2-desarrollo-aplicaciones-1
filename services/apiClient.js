// Cliente HTTP de toda la app. Ningun service crea su propio cliente:
// todos importan este. Si crean otro con axios.create(), los interceptores
// de abajo no se ejecutan y los pedidos salen sin token.
import axios from 'axios';
import { BASE_URL, TIMEOUT_MS } from '../config/env';
import { leerToken } from './sesionStorage';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// Request: le pega el token a todo lo que sale, si hay sesion.
// Lo leemos del storage en cada pedido a proposito: asi nunca queda
// desincronizado con lo que realmente esta guardado.
apiClient.interceptors.request.use(async (config) => {
  const token = await leerToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (__DEV__) {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
  }
  return config;
});

// Qué hacer cuando el backend dice que la sesión ya no vale.
//
// Lo registra AuthContext, que es el único que sabe cómo cerrar sesión. El
// cliente no puede importarlo: este archivo es JavaScript puro y AuthContext
// es un componente de React, así que importarlo sería una dependencia
// circular.
let alPerderLaSesion = null;

export function registrarCierreDeSesion(manejador) {
  alPerderLaSesion = manejador;
}

// Response: traduce el error del backend a algo que las pantallas puedan
// mostrar, y además vigila los 401.
//
// Por qué el 401 se maneja ACÁ y no en cada pantalla: es el único lugar por
// donde pasan todos los pedidos. Si cada pantalla tuviera que acordarse de
// revisar el 401, alcanza con que una se olvide para que la persona quede
// viendo "Token inválido" sin entender qué le pasó: que es exactamente lo
// que estaba pasando.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalizado = normalizarError(error);

    // Solo si el pedido llevaba token. Un 401 del login es "la contraseña
    // está mal", no "se venció la sesión", y cerrar sesión ahí no tendría
    // sentido: no hay ninguna abierta.
    const llevabaToken = Boolean(error.config?.headers?.Authorization);
    if (normalizado.estado === 401 && llevabaToken && alPerderLaSesion) {
      alPerderLaSesion(mensajeDeCierre(normalizado.codigo));
    }

    throw normalizado;
  }
);

// Por qué se cerró, en palabras. Si la persona no sabe por qué la sacaron,
// lo único que puede pensar es que la app se rompió.
function mensajeDeCierre(codigo) {
  if (codigo === 'TOKEN_EXPIRADO') {
    return 'Tu sesión venció. Ingresá de nuevo.';
  }
  return 'Tu sesión dejó de ser válida. Ingresá de nuevo.';
}

export class ErrorApi extends Error {
  constructor(mensaje, codigo, estado) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.codigo = codigo;
    this.estado = estado;
  }

  // Las pantallas preguntan esto para decidir si muestran el cartel de
  // "sin conexion" en vez del mensaje de error.
  get esDeConexion() {
    return this.codigo === 'SIN_CONEXION';
  }
}

function normalizarError(error) {
  // Sin respuesta = no llegamos al servidor (sin red, IP mal, backend apagado).
  if (!error.response) {
    if (__DEV__) {
      console.warn(`[API] no se pudo alcanzar ${BASE_URL} -> ${error.message}`);
    }
    return new ErrorApi('Sin conexion, intenta nuevamente', 'SIN_CONEXION', 0);
  }

  const { status, data } = error.response;
  const cuerpo = data?.error;
  return new ErrorApi(
    cuerpo?.mensaje ?? 'Ocurrio un error inesperado',
    cuerpo?.codigo ?? 'ERROR',
    status
  );
}

export default apiClient;
