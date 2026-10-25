// Unico lugar donde vive la URL del backend.
//
// Nadie mas en el proyecto escribe una URL a mano: todos importan BASE_URL
// de aca. En la entrega anterior perdimos medio dia porque un merge dejo una
// IP hardcodeada en el cliente HTTP y la app no se conectaba a nada.
//
// El valor sale del .env de cada uno (ver .env.example). Si no hay .env,
// cae en el host del emulador de Android, que es lo que usa la mayoria.
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000/api';

// Cuanto esperamos una respuesta antes de darla por perdida.
export const TIMEOUT_MS = 10000;
