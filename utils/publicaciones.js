// Cómo se muestran los códigos que manda el backend sobre una publicación.
//
// El backend habla en mayúsculas ('ENCONTRE', 'EN_RECLAMO', 'TARDE') y la
// persona lee en castellano. Esa traducción vive acá, en un solo lugar, para
// que el detalle, los reclamos y el historial digan lo mismo.
import { colors } from '../config/theme';

export const ESTADOS_PUBLICACION = {
  ABIERTA: { texto: 'Abierta', color: colors.success },
  EN_RECLAMO: { texto: 'En reclamo', color: colors.warning },
  RESUELTA: { texto: 'Resuelta', color: colors.secondary },
  VENCIDA: { texto: 'Vencida', color: colors.danger },
};

export function describirEstado(estado) {
  return ESTADOS_PUBLICACION[estado] ?? { texto: estado, color: colors.textSecondary };
}

export function describirTipo(tipo) {
  return tipo === 'PERDI' ? 'Perdí algo' : 'Encontré algo';
}

// "Ocurrió ayer, a la tarde". La franja NO_SE no agrega nada: decir "no sé a
// qué hora" no le sirve a nadie que esté leyendo.
const FRANJAS = {
  MANANA: 'a la mañana',
  TARDE: 'a la tarde',
  NOCHE: 'a la noche',
};

export function describirFranja(franja) {
  return FRANJAS[franja] ?? null;
}

// El texto de una alerta del punto 9 ("Perdí algo · Llaves · "rojas" ·
// Palermo"). Las alertas vienen del backend con la categoría y el barrio
// como objetos; esto las lleva a la misma forma que las búsquedas del
// punto 3 para que las dos se lean igual.
export function describirAlerta(alerta) {
  const { queTePaso, categoria, barrio, q } = alerta.criterios;
  const partes = [queTePaso === 'PERDI' ? 'Perdí algo' : 'Encontré algo'];
  if (categoria) partes.push(categoria.nombre);
  if (q) partes.push(`"${q}"`);
  if (barrio) partes.push(barrio.nombre);
  return partes.join(' · ');
}
