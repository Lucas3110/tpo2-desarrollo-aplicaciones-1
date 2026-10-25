// Punto 5: todo lo que la app le pide al backend sobre publicaciones.
//
// JavaScript puro, sin JSX. Todas salen por apiClient, que es el único
// cliente con interceptores.
import apiClient from './apiClient';
import { BASE_URL } from '../config/env';

// GET /hallado/categorias
// Documentos, Llaves, Electronica, Mascotas, Ropa, Otros.
export async function obtenerCategorias() {
  const { data } = await apiClient.get('/hallado/categorias');
  return data.categorias;
}

// GET /hallado/barrios
// Por detrás son las zonas que ya usaba la entrega anterior, pero el backend
// las expone con el nombre que usa el enunciado nuevo.
export async function obtenerBarrios() {
  const { data } = await apiClient.get('/hallado/barrios');
  return data.barrios;
}

// POST /hallado/publicaciones
//
// Espera el objeto tal cual lo arma el wizard. La pregunta y la respuesta de
// verificación sólo van en las de tipo ENCONTRE: el backend rechaza una
// pérdida que las traiga.
export async function crearPublicacion(datos) {
  const { data } = await apiClient.post('/hallado/publicaciones', datos);
  return data.publicacion;
}

// Las fotos se guardan con la URL relativa que devuelve el backend
// (/uploads/xxx.jpg) y no absoluta, para que no quede clavado el host con el
// que se subieron. Esta función es la que le pone el origen que corresponde
// al momento de mostrarlas.
//
// Las URLs externas (las de prueba, que empiezan con http) pasan de largo.
export function urlDeFoto(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  // BASE_URL termina en /api y las fotos cuelgan de la raíz del backend.
  return BASE_URL.replace(/\/api\/?$/, '') + url;
}
