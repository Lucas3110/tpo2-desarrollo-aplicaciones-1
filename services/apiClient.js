// Cliente HTTP de toda la app. Ningun service crea su propio cliente:
// todos importan este. Si crean otro con axios.create(), los interceptores
// de abajo no se ejecutan y los pedidos salen sin token.
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { BASE_URL, TIMEOUT_MS } from '../config/env';
import { leerToken } from './sesionStorage';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
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

// Punto 6: qué hacer cuando cambia el alcance real al servidor.
// Lo registra NetworkContext con el mismo patrón que AuthContext.
let alCambiarConexion = null;

export function registrarCambioDeConexion(manejador) {
  alCambiarConexion = manejador;
}

// Request: le pega el token a todo lo que sale, si hay sesion.
//
// Punto 6: cortamos acá con `SIN_CONEXION` SOLO cuando NetInfo dice que el
// dispositivo no tiene ninguna interfaz de red (`isConnected === false`, por
// ejemplo Modo Avión). NO miramos `isInternetReachable`: ese valor sale de un
// ping a internet pública, y con el backend en localhost/LAN puede valer
// `false` aunque el servidor responda perfecto. Si el backend de verdad no
// responde, axios falla sin `response` y `normalizarError` lo convierte en
// `SIN_CONEXION` igual.
apiClient.interceptors.request.use(async (config) => {
  const estadoRed = await NetInfo.fetch().catch(() => null);
  if (estadoRed && estadoRed.isConnected === false) {
    // pudoLlegar = false: el pedido nunca salió del teléfono.
    throw new ErrorApi(MENSAJE_SIN_RED, 'SIN_CONEXION', 0, false, CAUSA_SIN_RED);
  }

  const token = await leerToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (__DEV__) {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
  }
  return config;
});

// Response: traduce el error del backend a algo que las pantallas puedan
// mostrar, y además vigila los 401 y el estado de conexión.
apiClient.interceptors.response.use(
  (response) => {
    if (alCambiarConexion) alCambiarConexion(true, null);
    return response;
  },
  async (error) => {
    const normalizado = error instanceof ErrorApi ? error : normalizarError(error);

    // Sin respuesta del servidor: ¿es que el teléfono no tiene red, o que tiene
    // red y el servidor no contesta (apagado, caído, timeout)? Son problemas
    // distintos y la persona tiene que poder saber cuál es: con uno se
    // arregla prendiendo el WiFi, con el otro esperando.
    if (normalizado.esDeConexion && normalizado.causa === null) {
      const estadoRed = await NetInfo.fetch().catch(() => null);
      const sinRed = estadoRed && estadoRed.isConnected === false;
      normalizado.causa = sinRed ? CAUSA_SIN_RED : CAUSA_SERVIDOR;
      normalizado.message = sinRed ? MENSAJE_SIN_RED : MENSAJE_SERVIDOR;
    }

    // Los pedidos de la sincronización en segundo plano llevan
    // `sinAvisoDeConexion`: si uno falla (por ejemplo una foto grande que no
    // llega a subirse a tiempo) no se marca TODA la app como "sin servidor",
    // porque eso deshabilitaba botones aunque el resto de los pedidos andaba.
    // Los fallos de lo que hace la persona sí se avisan.
    if (normalizado.esDeConexion && alCambiarConexion && !error.config?.sinAvisoDeConexion) {
      alCambiarConexion(false, normalizado.causa);
    }

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

// Por qué no se pudo hablar con el servidor. Las dos usan el mismo código
// `SIN_CONEXION` (toda la lógica offline cuelga de ahí); `causa` solo sirve para
// decirle a la persona qué está pasando.
export const CAUSA_SIN_RED = 'SIN_RED';
export const CAUSA_SERVIDOR = 'SERVIDOR';
const MENSAJE_SIN_RED = 'Sin conexión, intentá nuevamente';
const MENSAJE_SERVIDOR = 'No pudimos comunicarnos con el servidor, intentá en unos minutos';

export class ErrorApi extends Error {
  // `pudoLlegar`: true si el pedido llegó a salir hacia el servidor (timeout,
  // corte a mitad de camino). En ese caso el servidor pudo haberlo procesado
  // aunque no recibamos la respuesta; la cola offline lo usa para no duplicar
  // publicaciones.
  //
  // `causa`: CAUSA_SIN_RED (el teléfono no tiene red), CAUSA_SERVIDOR (tiene red
  // pero el servidor no responde) o null (todavía no se determinó, o no es un
  // error de conexión).
  constructor(mensaje, codigo, estado, pudoLlegar = false, causa = null) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.codigo = codigo;
    this.estado = estado;
    this.pudoLlegar = pudoLlegar;
    this.causa = causa;
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
    // La causa (sin red o servidor caído) se completa en el interceptor, que
    // es donde se puede consultar NetInfo (acá no se puede esperar).
    return new ErrorApi(MENSAJE_SIN_RED, 'SIN_CONEXION', 0, true, null);
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
