// Punto 8: punto de encuentro de un reclamo aceptado.
// JavaScript puro: todos los pedidos salen por apiClient con el token de sesión.
import apiClient from './apiClient';

// GET /hallado/reclamos/:id/encuentro: lugar vigente y permisos de quien consulta.
export async function obtenerEncuentro(reclamoId) {
  const { data } = await apiClient.get(`/hallado/reclamos/${reclamoId}/encuentro`);
  return data;
}

// POST /hallado/reclamos/:id/encuentro: propone o sugiere una alternativa con su versión.
export async function proponerEncuentro(reclamoId, datos) {
  const { data } = await apiClient.post(`/hallado/reclamos/${reclamoId}/encuentro`, datos);
  return data;
}

// POST /hallado/reclamos/:id/encuentro/aceptar: acuerda la propuesta de la otra parte.
export async function aceptarEncuentro(reclamoId, version) {
  const { data } = await apiClient.post(`/hallado/reclamos/${reclamoId}/encuentro/aceptar`, {
    version,
  });
  return data;
}
