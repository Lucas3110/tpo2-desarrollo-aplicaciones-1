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

// Response: traduce el error del backend a algo que las pantallas puedan mostrar.
// El backend contesta { error: { codigo, mensaje } }, y cuando no hay red
// axios no trae response ninguna.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    throw normalizarError(error);
  }
);

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
