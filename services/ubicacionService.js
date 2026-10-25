// Punto 5: "Indicar el barrio y la dirección exacta, ya sea escribiéndola o
// tomando la ubicación actual del dispositivo (cargar coordenadas)."
//
// Las coordenadas no son un adorno: el punto 3 ordena los resultados por
// cercanía con ellas, y el punto 8 abre el mapa con ellas.
import * as Location from 'expo-location';

// Precisión Balanced y no Highest a propósito. Highest enciende el GPS y
// puede tardar medio minuto a cielo abierto, más adentro de un edificio.
// Balanced usa WiFi y antenas, contesta en un par de segundos y tiene un
// error de unas decenas de metros — que para "en qué esquina lo encontré"
// es más que suficiente.
const PRECISION = Location.Accuracy.Balanced;

// Cuánto esperamos cada intento antes de pasar al siguiente. El del GPS
// espera más porque tarda más, sobre todo la primera vez.
const TIMEOUT_BALANCEADO_MS = 8000;
const TIMEOUT_GPS_MS = 20000;

export class ErrorUbicacion extends Error {
  constructor(mensaje, codigo) {
    super(mensaje);
    this.name = 'ErrorUbicacion';
    this.codigo = codigo;
  }
}

// Devuelve { lat, lng }. Lanza ErrorUbicacion con un mensaje que se puede
// mostrar tal cual.
export async function ubicacionActual() {
  const servicios = await Location.hasServicesEnabledAsync();
  if (!servicios) {
    throw new ErrorUbicacion(
      'Tenés la ubicación apagada. Prendela desde los ajustes del teléfono.',
      'SERVICIOS_APAGADOS'
    );
  }

  const permiso = await Location.requestForegroundPermissionsAsync();
  if (!permiso.granted) {
    throw new ErrorUbicacion(
      'Necesitamos permiso para usar tu ubicación. Podés escribir la dirección a mano.',
      'SIN_PERMISO'
    );
  }

  let posicion;
  try {
    // Primero Balanced, que es lo normal y lo rápido.
    posicion = await conTimeout(PRECISION, TIMEOUT_BALANCEADO_MS);
  } catch (primerError) {
    try {
      // Si no contestó, se insiste con el GPS.
      //
      // Balanced se apoya en WiFi y antenas, y hay dos situaciones donde eso
      // no existe: un emulador (que sólo tiene un GPS simulado) y un celular
      // real en un lugar sin redes conocidas. En las dos, el GPS sí contesta,
      // sólo que tarda más. Por eso el segundo intento espera el doble.
      posicion = await conTimeout(Location.Accuracy.High, TIMEOUT_GPS_MS);
    } catch (segundoError) {
      // Antes de darnos por vencidos: la última posición conocida.
      //
      // Si ni el GPS engancha, el sistema casi siempre guarda la última
      // lectura que tomó. Para "¿en qué esquina lo encontraste?" una posición
      // de hace unos minutos sirve igual, y es mucho mejor que ninguna.
      const ultima = await ultimaConocida();
      if (ultima) return ultima;

      // Los errores que ya tradujimos pasan de largo.
      if (segundoError instanceof ErrorUbicacion) throw segundoError;
      throw traducir(segundoError);
    }
  }

  return {
    lat: posicion.coords.latitude,
    lng: posicion.coords.longitude,
  };
}

// expo-location no trae timeout propio, así que lo ponemos nosotros. La
// promesa que pierde la carrera no se cancela, pero queda huérfana y no
// molesta a nadie.
async function conTimeout(precision, ms) {
  return Promise.race([
    Location.getCurrentPositionAsync({ accuracy: precision }),
    new Promise((_, rechazar) =>
      setTimeout(
        () =>
          rechazar(
            new ErrorUbicacion(
              'No pudimos ubicarte. Probá de nuevo o escribí la dirección a mano.',
              'TIMEOUT'
            )
          ),
        ms
      )
    ),
  ]);
}

// Devuelve la última posición que registró el sistema, o null.
//
// maxAge de 10 minutos: más vieja que eso ya no describe dónde está la
// persona ahora, y para este caso de uso sería peor que no poner nada.
async function ultimaConocida() {
  try {
    const posicion = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 });
    if (!posicion) return null;
    return { lat: posicion.coords.latitude, lng: posicion.coords.longitude };
  } catch {
    return null;
  }
}

// getCurrentPositionAsync tira errores propios de la librería, con mensajes
// en inglés y escritos para quien programa, no para quien usa la app. Sin
// esto, a la persona le aparece "Location request failed due to unsatisfied
// device settings" en el medio de la pantalla y no sabe qué hacer.
function traducir(error) {
  // expo-location usa el prefijo ERR_, pero versiones anteriores usaban E_.
  // Sacamos el prefijo y comparamos el resto, así no se rompe si cambia.
  const codigo = String(error?.code ?? '').replace(/^(ERR_|E_)/, '');

  if (codigo === 'LOCATION_SETTINGS_UNSATISFIED') {
    return new ErrorUbicacion(
      'Tu teléfono tiene la precisión de ubicación desactivada. Prendela desde los ' +
        'ajustes, o escribí la dirección a mano.',
      'AJUSTES_INSUFICIENTES'
    );
  }

  if (codigo === 'LOCATION_UNAVAILABLE' || codigo === 'LOCATION_TIMEOUT') {
    return new ErrorUbicacion(
      'No pudimos ubicarte ahora. Probá de nuevo o escribí la dirección a mano.',
      'NO_DISPONIBLE'
    );
  }

  if (codigo === 'NO_PERMISSIONS' || codigo === 'LOCATION_UNAUTHORIZED') {
    return new ErrorUbicacion(
      'Necesitamos permiso para usar tu ubicación. Podés escribir la dirección a mano.',
      'SIN_PERMISO'
    );
  }

  // Cualquier otra cosa: un mensaje que se entiende y que deja una salida.
  // El original va al log, para poder diagnosticarlo sin mostrárselo.
  if (__DEV__) console.warn('[ubicacion] error sin traducir:', codigo, error?.message);
  return new ErrorUbicacion(
    'No pudimos tomar tu ubicación. Escribí la dirección a mano y seguí.',
    'DESCONOCIDO'
  );
}

// De coordenadas a una dirección escrita, para rellenar el campo solo.
//
// Es "si sale, sale": el geocoder inverso depende de un servicio externo y
// de que el dispositivo lo tenga. Si falla devolvemos null y listo — las
// coordenadas, que son lo que de verdad importa, ya las tenemos.
export async function direccionDeCoordenadas({ lat, lng }) {
  try {
    const lugares = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const lugar = lugares[0];
    if (!lugar) return null;

    // Calle y altura es lo que la gente reconoce como "la dirección".
    const partes = [lugar.street, lugar.streetNumber].filter(Boolean);
    return partes.length > 0 ? partes.join(' ') : null;
  } catch {
    return null;
  }
}

// Para mostrar las coordenadas de forma legible. Seis decimales son unos
// 10 cm: más que eso es ruido del sensor.
export function formatearCoordenadas({ lat, lng }) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
