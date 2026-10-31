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
