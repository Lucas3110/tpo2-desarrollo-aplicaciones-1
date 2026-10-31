import apiClient from './apiClient';

export async function obtenerEncuentro(reclamoId) {
  const { data } = await apiClient.get(`/hallado/reclamos/${reclamoId}/encuentro`);
  return data;
}

export async function proponerEncuentro(reclamoId, datos) {
  const { data } = await apiClient.post(`/hallado/reclamos/${reclamoId}/encuentro`, datos);
  return data;
}

export async function aceptarEncuentro(reclamoId, version) {
  const { data } = await apiClient.post(`/hallado/reclamos/${reclamoId}/encuentro/aceptar`, { version });
  return data;
}

export async function concretarEncuentro(reclamoId, version) {
  const { data } = await apiClient.post(`/hallado/reclamos/${reclamoId}/encuentro/concretar`, { version });
  return data;
}
