// Punto 7: todo lo que la app le pide al backend sobre reclamos.
//
// JavaScript puro, sin JSX. Todas salen por apiClient, que es el único
// cliente con interceptores.
import apiClient from './apiClient';

// POST /hallado/publicaciones/:id/reclamos
//
// Qué va en `datos` depende del tipo de la publicación, que decide el
// backend por su cuenta:
//   algo ENCONTRADO ("Es mío"):      { respuesta, descripcion?, fotoUrl? }
//   algo PERDIDO    ("Lo encontré"): { fotoUrl, barrioId, descripcion? }
//
// Si la respuesta a la pregunta de verificación no coincide, el backend
// contesta 400 RESPUESTA_INCORRECTA con cuántos intentos quedan en el
// mensaje: ese intento ya se gastó.
export async function crearReclamo(publicacionId, datos) {
  const { data } = await apiClient.post(`/hallado/publicaciones/${publicacionId}/reclamos`, datos);
  return data.reclamo;
}
