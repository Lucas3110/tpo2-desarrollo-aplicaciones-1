// Unico lugar donde vive la URL del backend.
//
// Nadie mas en el proyecto escribe una URL a mano: todos importan BASE_URL
// de aca. En la entrega anterior perdimos medio dia porque un merge dejo una
// IP hardcodeada en el cliente HTTP y la app no se conectaba a nada.
//
// El valor sale del .env de cada uno (ver .env.example). El default es
// localhost porque es lo que funciona con el tunel de adb:
//
//     adb reverse tcp:3000 tcp:3000
//
// Sin ese tunel el emulador no alcanza al backend: el firewall de Windows
// bloquea la entrada al 3000. Esta explicado en el README.
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

// Cuanto esperamos una respuesta antes de darla por perdida.
export const TIMEOUT_MS = 10000;
