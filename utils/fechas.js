// Fechas.
//
// El backend habla en 'AAAA-MM-DD' y la persona escribe 'DD/MM/AAAA', que es
// como se escriben las fechas acá. Toda la traducción entre los dos formatos
// vive en este archivo.
//
// Nada de `new Date(texto).toISOString()`: toISOString convierte a UTC, y en
// Argentina (UTC-3) eso corre la fecha un día para atrás. Armamos el texto a
// mano con los getters locales.

function aIso(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export function hoyIso() {
  return aIso(new Date());
}

export function isoDeHace(dias) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return aIso(fecha);
}

// 'AAAA-MM-DD' -> 'DD/MM/AAAA'
export function isoATexto(iso) {
  if (!iso) return '';
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}

// 'DD/MM/AAAA' -> 'AAAA-MM-DD', o null si no es una fecha válida.
//
// Se chequea que la fecha exista de verdad y no sólo que tenga el formato:
// 31/02/2026 pasa cualquier expresión regular, pero no es un día.
export function textoAIso(texto) {
  const limpio = String(texto ?? '').trim();
  const partes = limpio.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!partes) return null;

  const dia = Number(partes[1]);
  const mes = Number(partes[2]);
  const anio = Number(partes[3]);

  const fecha = new Date(anio, mes - 1, dia);
  const existe =
    fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;

  return existe ? aIso(fecha) : null;
}

// Para mostrar: las fechas cercanas se leen mejor en palabras.
export function describirFecha(iso) {
  if (!iso) return '';
  if (iso === hoyIso()) return 'hoy';
  if (iso === isoDeHace(1)) return 'ayer';
  if (iso === isoDeHace(2)) return 'anteayer';
  return isoATexto(iso);
}

export function esFutura(iso) {
  return iso > hoyIso(); // 'AAAA-MM-DD' ordena bien como texto
}

// Las opciones rápidas del paso "¿cuándo?". La mayoría de las veces alcanza
// con una de estas: quien perdió algo se acuerda si fue hoy o ayer.
export const ATAJOS_FECHA = [
  { etiqueta: 'Hoy', dias: 0 },
  { etiqueta: 'Ayer', dias: 1 },
  { etiqueta: 'Hace 3 días', dias: 3 },
  { etiqueta: 'Hace una semana', dias: 7 },
];
