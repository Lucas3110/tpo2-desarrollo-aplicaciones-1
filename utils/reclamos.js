// Cómo se muestran los códigos que manda el backend sobre un reclamo.
// Mismo criterio que utils/publicaciones.js: la traducción vive en un lugar.
import { colors } from '../config/theme';

export const ESTADOS_RECLAMO = {
  PENDIENTE: { texto: 'Pendiente', color: colors.warning },
  ACEPTADO: { texto: 'Aceptado', color: colors.success },
  RECHAZADO: { texto: 'Rechazado', color: colors.danger },
  VENCIDO: { texto: 'Vencido', color: colors.textSecondary },
};

export function describirEstadoReclamo(estado) {
  return ESTADOS_RECLAMO[estado] ?? { texto: estado, color: colors.textSecondary };
}

export function describirTipoReclamo(tipo) {
  return tipo === 'ES_MIO' ? 'Es mío' : 'Lo encontré';
}

// "Vence en 36 h". El backend manda las horas ya calculadas para no hacer
// cuentas con zonas horarias en el celular.
export function describirVencimiento(horas) {
  if (horas === null || horas === undefined) return null;
  if (horas <= 1) return 'Vence en menos de 1 h';
  if (horas < 48) return `Vence en ${horas} h`;
  return `Vence en ${Math.ceil(horas / 24)} días`;
}
