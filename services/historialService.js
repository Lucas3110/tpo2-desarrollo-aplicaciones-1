// Punto 10: el historial de casos resueltos.
//
// JavaScript puro, sin JSX. Sale por apiClient como todo lo demás.
import apiClient from './apiClient';

// GET /hallado/historial
//
// Devuelve { casos, resumen }. Un caso es un reclamo aceptado visto desde mi
// lado: `rol` dice si DEVOLVI o RECUPERE, y trae la fecha, el objeto, la
// contraparte y las valoraciones (la mía y la recibida).
//
// `tipo` filtra por rol y `desde`/`hasta` por fecha de la devolución, en
// AAAA-MM-DD. El resumen cuenta siempre el total de cada lado, no lo
// filtrado: es lo que necesitan las solapas.
export async function obtenerHistorial({ tipo, desde, hasta } = {}) {
  const { data } = await apiClient.get('/hallado/historial', {
    // axios saltea los undefined, así que los filtros vacíos no viajan.
    params: {
      tipo: tipo || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
    },
  });
  return data;
}

// POST /hallado/reclamos/:id/valoracion   { tipo, mensaje?, agradecimiento? }
//
// Una sola vez por caso y dentro de los 7 días de la devolución; si no, el
// backend contesta YA_VALORASTE o PLAZO_VENCIDO. El agradecimiento sólo lo
// acepta si quien valora es quien recuperó su objeto.
export async function valorarCaso(reclamoId, datos) {
  const { data } = await apiClient.post(`/hallado/reclamos/${reclamoId}/valoracion`, datos);
  return data.valoracion;
}
