// Los carteles de "sin conexión" tienen que decir lo que de verdad pasa:
//
// - SIN_RED: el teléfono no tiene red (modo avión, sin WiFi ni datos). Se
//   arregla del lado de la persona.
// - SERVIDOR: el teléfono tiene red pero el servidor no responde. Decirle a
//   alguien con WiFi "no hay internet" lo manda a revisar lo que no es.
//
// `motivo` es `motivoOffline` de NetworkContext (o `causa` de un ErrorApi).
// Cualquier valor que no sea 'SERVIDOR' se trata como falta de red, que es el
// caso común.
export function segunMotivo(motivo, textoSinRed, textoServidor) {
  return motivo === 'SERVIDOR' ? textoServidor : textoSinRed;
}

export const TEXTOS = {
  // Aviso arriba del asistente de "Publicar".
  cargaOffline: (motivo) =>
    segunMotivo(
      motivo,
      'Estás sin conexión. Podés completar la carga igual: quedará pendiente de envío y se publicará automáticamente al volver internet.',
      'No podemos comunicarnos con el servidor. Podés completar la carga igual: quedará pendiente de envío y se publicará automáticamente cuando vuelva a responder.'
    ),

  // Confirmación de una publicación guardada en el teléfono.
  publicacionGuardada: (motivo) =>
    segunMotivo(
      motivo,
      'Guardamos tu publicación en el dispositivo porque no hay internet. Se va a publicar automáticamente apenas recuperes la conexión.',
      'Guardamos tu publicación en el dispositivo porque no pudimos comunicarnos con el servidor. Se va a publicar automáticamente apenas vuelva a responder.'
    ),

  pendientesEnLista: (motivo) =>
    segunMotivo(
      motivo,
      'Sin conexión: tus publicaciones pendientes se enviarán automáticamente al volver internet.',
      'No podemos comunicarnos con el servidor: tus publicaciones pendientes se enviarán automáticamente cuando vuelva a responder.'
    ),

  datosDesactualizados: (motivo) =>
    segunMotivo(
      motivo,
      'Sin conexión: la información podría no estar actualizada.',
      'No podemos comunicarnos con el servidor: la información podría no estar actualizada.'
    ),

  buscadorOffline: (motivo) =>
    segunMotivo(
      motivo,
      'Estás sin conexión. Podés buscar igual para consultar los últimos resultados guardados en tu teléfono.',
      'No podemos comunicarnos con el servidor. Podés buscar igual para consultar los últimos resultados guardados en tu teléfono.'
    ),

  resultadosGuardados: (motivo) =>
    segunMotivo(
      motivo,
      'Sin conexión: mostrando los últimos resultados cargados exitosamente. La información podría no estar actualizada.',
      'No podemos comunicarnos con el servidor: mostrando los últimos resultados cargados exitosamente. La información podría no estar actualizada.'
    ),

  copiaGuardadaDetalle: (motivo) =>
    segunMotivo(
      motivo,
      'Estás viendo una copia guardada sin conexión. La información podría no estar actualizada y necesitás conexión a internet para realizar acciones.',
      'Estás viendo una copia guardada porque no podemos comunicarnos con el servidor. La información podría no estar actualizada y las acciones no están disponibles por ahora.'
    ),

  // Detalle de una publicación que nunca se abrió y no hay copia guardada.
  detalleNoDisponible: (motivo) =>
    segunMotivo(
      motivo,
      'Esta publicación no está disponible sin conexión porque todavía no la abriste con internet. Conectate para verla.',
      'Esta publicación no está disponible ahora porque no podemos comunicarnos con el servidor y todavía no la abriste. Probá de nuevo en unos minutos.'
    ),

  necesitaConexion: (motivo, accion) =>
    segunMotivo(
      motivo,
      `Necesitás conexión a internet para ${accion}.`,
      `Necesitamos poder comunicarnos con el servidor para ${accion}. Probá de nuevo en unos minutos.`
    ),
};
