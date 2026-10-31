// Punto 9: las alertas.
//
// "Cualquier búsqueda realizada desde el buscador puede guardarse como
// alerta, con todos sus criterios (tipo, categoría, barrio y palabras
// clave)."
//
// Ojo que esto NO son las últimas búsquedas del punto 3
// (historialBusquedasService): esas se guardan solas y viven en el teléfono.
// Una alerta la guarda la persona a propósito, vive en el backend y avisa
// cuando aparece algo nuevo.
//
// JavaScript puro, sin JSX. Todas salen por apiClient, que es el único
// cliente con interceptores.
import apiClient from './apiClient';

// POST /hallado/alertas   { queTePaso, categoriaId?, barrioId?, q? }
//
// Se mandan sólo los cuatro criterios de una alerta. Las fechas, el orden y
// las coordenadas no viajan: una alerta mira lo que se publique de acá en
// adelante, así que "de la última semana" o "cerca de donde estaba aquella
// vez" no tienen sentido en ella.
//
// Devuelve { alerta, creada }. Guardar dos veces la misma búsqueda no es un
// error: el backend devuelve la que ya estaba con creada = false.
export async function crearAlerta(criterios) {
  const { data } = await apiClient.post('/hallado/alertas', {
    queTePaso: criterios.queTePaso,
    categoriaId: criterios.categoriaId || undefined,
    barrioId: criterios.barrioId || undefined,
    q: criterios.q || undefined,
  });
  return data;
}

// GET /hallado/alertas
//
// "Mis alertas". Devuelve { alertas, totalNuevas }. Cada alerta trae sus
// criterios (con los nombres de la categoría y el barrio ya resueltos) y
// cuántas publicaciones nuevas coinciden con ella. Una pausada siempre
// cuenta 0: pausar es justamente no querer avisos.
export async function misAlertas() {
  const { data } = await apiClient.get('/hallado/alertas');
  return data;
}

// PATCH /hallado/alertas/:id   { activa }
//
// Pausar y reanudar. Al reanudar, lo que se publicó mientras estuvo
// pausada no cuenta como nuevo. Devuelve la alerta actualizada.
export async function cambiarEstadoAlerta(id, activa) {
  const { data } = await apiClient.patch(`/hallado/alertas/${id}`, { activa });
  return data.alerta;
}

// DELETE /hallado/alertas/:id
export async function eliminarAlerta(id) {
  const { data } = await apiClient.delete(`/hallado/alertas/${id}`);
  return data;
}

// GET /hallado/alertas/:id/publicaciones?pagina=&limite=
//
// Lo que encuentra la alerta, con el mismo formato y paginado que el
// buscador, más esNueva en cada publicación. Lo publicado por uno mismo no
// aparece. Mirar NO marca como visto: eso es marcarAlertaVista.
export async function publicacionesDeAlerta(id, { pagina, limite } = {}) {
  const { data } = await apiClient.get(`/hallado/alertas/${id}/publicaciones`, {
    params: { pagina: pagina || undefined, limite: limite || undefined },
  });
  return data;
}

// POST /hallado/alertas/:id/vista
//
// Lo ya publicado deja de contar como nuevo. Devuelve la alerta con
// nuevas = 0.
export async function marcarAlertaVista(id) {
  const { data } = await apiClient.post(`/hallado/alertas/${id}/vista`);
  return data.alerta;
}

// GET /hallado/novedades
//
// El resumen para el indicador de novedad del menú: con un solo pedido se
// sabe si prender el de "Mis alertas" y el de "Seguidas", sin traer las dos
// listas enteras. Devuelve
//   { alertas: { publicacionesNuevas, alertasConNovedad },
//     seguidas: { conNovedad },
//     hayNovedades }
export async function obtenerNovedades() {
  const { data } = await apiClient.get('/hallado/novedades');
  return data;
}
