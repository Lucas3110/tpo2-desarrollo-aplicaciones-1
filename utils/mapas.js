// La ubicación propuesta puede ser diferente de donde se encontró el objeto.
// Nunca usamos las coordenadas originales de la publicación como destino.
export function urlComoLlegar({ direccion, lat, lng }, plataforma) {
  const destino = Number.isFinite(lat) && Number.isFinite(lng) ? `${lat},${lng}` : direccion.trim();
  return plataforma === 'android'
    ? `google.navigation:q=${encodeURIComponent(destino)}&mode=w`
    : urlMapsWeb({ direccion, lat, lng });
}

export function urlMapsWeb({ direccion, lat, lng }) {
  const destino = Number.isFinite(lat) && Number.isFinite(lng) ? `${lat},${lng}` : direccion.trim();
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}&travelmode=walking&dir_action=navigate`;
}
