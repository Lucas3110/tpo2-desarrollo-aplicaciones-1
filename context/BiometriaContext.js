// Punto 1: desbloqueo de la sesión con la biometría del dispositivo.
//
// Vive adentro de AuthProvider porque necesita saber si hay sesión: la
// biometría desbloquea una sesión que ya existe, no reemplaza al login.
//
// ---------------------------------------------------------------
// Cuándo se bloquea (esto es lo que hay que poder defender)
// ---------------------------------------------------------------
//
// Se bloquea en dos momentos, y en ninguno más:
//
//   1. Al abrir la app con una sesión que venía guardada de antes.
//   2. Cuando la app se va a segundo plano (botón de home, cambiar de app).
//      Al volver, pide la huella.
//
// NO se bloquea cuando la persona acaba de loguearse o registrarse: ya probó
// quién es con la contraseña o con el código, y pedirle la huella un segundo
// después no agrega nada.
//
// Para distinguir "sesión restaurada al abrir" de "recién se logueó" miramos
// `cargando` de AuthContext: mientras es true estamos restaurando. Lo que
// aparezca después es un login nuevo.
import { createContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '../hooks/useAuth';
import { guardarBiometriaActivada, leerBiometriaActivada } from '../services/preferencias';
import { registrarEnvoltorioDeDialogos } from '../services/dialogosDelSistema';

// Cuánto esperamos, después de que el prompt se cierra, antes de volver a
// escuchar los cambios de AppState. Ver el comentario de promptAbierto.
const MS_GRACIA_PROMPT = 1000;

export const BiometriaContext = createContext(null);

export function BiometriaProvider({ children }) {
  const { usuario, cargando: cargandoSesion } = useAuth();

  // El dispositivo tiene lector y hay al menos una huella/cara registrada.
  // Si no, el toggle no se puede activar.
  const [disponible, setDisponible] = useState(false);
  const [activada, setActivada] = useState(false);
  const [bloqueada, setBloqueada] = useState(false);

  // Dos cargas distintas: lo que tiene el TELÉFONO (lector, huellas
  // registradas) se averigua una vez, y lo que eligió LA CUENTA se vuelve a
  // leer cada vez que cambia el usuario.
  //
  // Las dos tienen que estar listas antes de decidir si se bloquea. Si se
  // decidiera con la preferencia a medio leer, una sesión guardada con la
  // huella activada no se bloquearía al abrir la app.
  const [cargandoDispositivo, setCargandoDispositivo] = useState(true);
  const [cargandoPreferencia, setCargandoPreferencia] = useState(true);
  const cargando = cargandoDispositivo || cargandoPreferencia;

  // Para saber si ya pasamos el arranque. Un ref y no un estado: cambiarlo no
  // tiene que provocar un render.
  const yaArranco = useRef(false);

  // Mientras hay un diálogo DEL SISTEMA abierto hay que ignorar AppState.
  //
  // Android manda la app a 'background' cuando aparece cualquiera de esos
  // diálogos, y no son "la persona se fue de la app": sigue adentro del
  // mismo flujo, eligiendo una foto o dándole permiso a algo.
  //
  // Con nuestro propio prompt de huella el efecto era un loop: el prompt
  // manda a background -> el listener bloquea -> aparece la pantalla de
  // desbloqueo -> que pide la huella sola -> al cerrarse ese prompt vuelve a
  // mandar background -> bloquea otra vez.
  //
  // Con el selector de galería o el permiso de ubicación el efecto es otro y
  // peor de explicar: elegís una foto y la app te pide la huella de la nada,
  // en la mitad de la carga de una publicación.
  const dialogoDelSistema = useRef(false);

  // Lo del dispositivo: no depende de quién esté logueado.
  useEffect(() => {
    const averiguar = async () => {
      try {
        const [hardware, enrolada] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ]);
        setDisponible(hardware && enrolada);
      } finally {
        setCargandoDispositivo(false);
      }
    };
    averiguar();
  }, []);

  // La preferencia: es de la cuenta. Se relee al cambiar de usuario, así
  // nadie hereda lo que eligió el anterior en este teléfono.
  useEffect(() => {
    let vigente = true;
    setCargandoPreferencia(true);

    leerBiometriaActivada(usuario?.id)
      .then((valor) => {
        if (vigente) setActivada(valor);
      })
      .finally(() => {
        if (vigente) setCargandoPreferencia(false);
      });

    // Si el usuario cambia otra vez antes de que termine esta lectura, la
    // respuesta vieja no tiene que pisar la nueva.
    return () => {
      vigente = false;
    };
  }, [usuario?.id]);

  // Decide si hay que bloquear cuando termina de restaurarse la sesión.
  useEffect(() => {
    if (cargandoSesion || cargando) return;

    if (!yaArranco.current) {
      yaArranco.current = true;
      // Sesión que venía guardada: se bloquea si la preferencia está activada.
      setBloqueada(usuario !== null && activada && disponible);
      return;
    }

    // De acá en adelante, que aparezca un usuario es un login nuevo.
    if (usuario === null) setBloqueada(false);
  }, [cargandoSesion, cargando, usuario, activada, disponible]);

  // Bloquear al irse a segundo plano.
  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado !== 'background') return;
      if (dialogoDelSistema.current) return; // un diálogo, no la persona
      if (usuario !== null && activada && disponible) setBloqueada(true);
    });
    return () => suscripcion.remove();
  }, [usuario, activada, disponible]);

  // Pide la huella. Devuelve true si salió bien.
  //
  // disableDeviceFallback en false a propósito: si la huella no se lee (dedo
  // mojado, lector sucio), el sistema ofrece el PIN del dispositivo. Sin eso,
  // unos cuantos rechazos dejan a la persona afuera.
  // Corre algo que abre un diálogo del sistema sin que eso bloquee la sesión.
  //
  // Lo usa esta misma pantalla para el prompt de huella, y las pantallas que
  // abren la galería o piden la ubicación. Es una función y no un par de
  // "avisar que empieza / avisar que termina" para que no quede nunca
  // prendida: el finally la apaga aunque lo de adentro explote.
  const conDialogoDelSistema = async (hacer) => {
    dialogoDelSistema.current = true;
    try {
      return await hacer();
    } finally {
      // El evento de AppState del diálogo llega DESPUÉS de que la promesa
      // resuelve, así que soltamos la bandera un toque más tarde. Si en ese
      // segundo la persona manda la app a segundo plano a mano, no se
      // bloquea: es un caso raro y el precio de que no se bloquee de más.
      setTimeout(() => {
        dialogoDelSistema.current = false;
      }, MS_GRACIA_PROMPT);
    }
  };

  // Los services que abren galería o piden ubicación avisan por acá, así
  // ninguna pantalla tiene que acordarse de hacerlo.
  useEffect(() => {
    registrarEnvoltorioDeDialogos(conDialogoDelSistema);
  }, []);

  const pedirHuella = (mensaje) =>
    conDialogoDelSistema(async () => {
      const resultado = await LocalAuthentication.authenticateAsync({
        promptMessage: mensaje,
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });
      return resultado.success === true;
    });

  // Activar pide la huella primero: así la persona comprueba en el momento que
  // funciona, en vez de descubrir recién al abrir la app que quedó afuera.
  const activar = async () => {
    const ok = await pedirHuella('Confirmá tu identidad para activar el desbloqueo');
    if (!ok) return false;
    await guardarBiometriaActivada(usuario?.id, true);
    setActivada(true);
    return true;
  };

  // Desactivar no pide nada: para llegar a configuración ya hubo que entrar a
  // la app, así que la huella ya se validó.
  const desactivar = async () => {
    await guardarBiometriaActivada(usuario?.id, false);
    setActivada(false);
    setBloqueada(false);
  };

  const desbloquear = async () => {
    const ok = await pedirHuella('Desbloqueá Hallado');
    if (ok) setBloqueada(false);
    return ok;
  };

  return (
    <BiometriaContext.Provider
      value={{
        disponible,
        activada,
        bloqueada,
        cargando,
        activar,
        desactivar,
        desbloquear,
      }}
    >
      {children}
    </BiometriaContext.Provider>
  );
}
