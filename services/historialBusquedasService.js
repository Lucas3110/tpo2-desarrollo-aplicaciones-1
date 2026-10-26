// Punto 3: "El buscador muestra las últimas búsquedas realizadas para poder
// repetirlas con un toque."
//
// Ojo que esto NO son las alertas del punto 9. Son dos cosas distintas y el
// enunciado las pide por separado:
//
//   Últimas búsquedas (acá)  se guardan solas, son locales, y sirven para
//                            repetir lo que acabás de buscar.
//   Alertas (punto 9)        las guarda la persona a propósito, viven en el
//                            backend y avisan cuando aparece algo nuevo.
//
// Por eso esto va en AsyncStorage y no en el backend: es un historial de
// este teléfono, no un dato de la cuenta. Además así funciona sin conexión,
// que es lo que va a necesitar el punto 6.
//
// La clave lleva el id del usuario: si alguien cambia de cuenta en el mismo
// teléfono no tiene por qué ver lo que buscó el otro.
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIJO = 'hallado.busquedas.';

// Cinco alcanza. El enunciado habla de "las últimas", no de un historial
// completo, y una lista larga en la pantalla de inicio tapa el buscador, que
// es lo que la persona vino a usar.
const MAXIMO = 5;

function clave(usuarioId) {
  return `${PREFIJO}${usuarioId}`;
}

export async function leerBusquedas(usuarioId) {
  try {
    const crudo = await AsyncStorage.getItem(clave(usuarioId));
    return crudo ? JSON.parse(crudo) : [];
  } catch {
    // JSON roto o storage que falla: sin historial, que no es un problema.
    return [];
  }
}

// Guarda una búsqueda arriba de todo.
//
// `etiquetas` son los nombres de la categoría y el barrio. Se guardan junto
// con los ids a propósito: si sólo guardáramos los ids, para mostrar la
// lista habría que pedir los catálogos y esperar, y la pantalla de inicio
// tiene que abrir enseguida.
export async function guardarBusqueda(usuarioId, criterios, etiquetas) {
  try {
    const previas = await leerBusquedas(usuarioId);
    const nueva = {
      id: Date.now(),
      criterios: sinCoordenadas(criterios),
      etiquetas,
      resumen: describirBusqueda(criterios, etiquetas),
    };

    // Si repitió la misma búsqueda, se mueve arriba en vez de duplicarse.
    const sinRepetida = previas.filter((b) => b.resumen !== nueva.resumen);

    await AsyncStorage.setItem(
      clave(usuarioId),
      JSON.stringify([nueva, ...sinRepetida].slice(0, MAXIMO))
    );
  } catch {
    // Que no se pueda guardar el historial no puede romper la búsqueda.
  }
}

export async function borrarBusquedas(usuarioId) {
  try {
    await AsyncStorage.removeItem(clave(usuarioId));
  } catch {
    // idem
  }
}

// Las coordenadas no se guardan.
//
// Repetir una búsqueda dentro de una semana con la posición de aquella vez
// ordenaría por "cercanía" a un lugar donde la persona ya no está, y eso es
// peor que no ordenar por cercanía. Si quiere, vuelve a tocar "buscar cerca
// mío" y toma la de ahora.
function sinCoordenadas(criterios) {
  const { coordenadas, orden, ...resto } = criterios;
  return { ...resto, orden: orden === 'CERCANOS' ? 'RECIENTES' : orden };
}

// El texto que se muestra en la lista. Se arma con lo que la persona eligió,
// no con los códigos internos.
export function describirBusqueda(criterios, etiquetas) {
  const partes = [];

  partes.push(criterios.queTePaso === 'PERDI' ? 'Perdí algo' : 'Encontré algo');
  if (etiquetas?.categoria) partes.push(etiquetas.categoria);
  if (criterios.q) partes.push(`"${criterios.q}"`);
  if (etiquetas?.barrio) partes.push(etiquetas.barrio);
  if (criterios.coordenadas) partes.push('cerca mío');

  const cuando = {
    HOY: 'hoy',
    TRES_DIAS: 'últimos 3 días',
    SEMANA: 'última semana',
    RANGO: 'un rango de fechas',
  }[criterios.cuando];
  if (cuando) partes.push(cuando);

  return partes.join(' · ');
}
