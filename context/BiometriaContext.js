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
  const [cargando, setCargando] = useState(true);

  // Para saber si ya pasamos el arranque. Un ref y no un estado: cambiarlo no
  // tiene que provocar un render.
  const yaArranco = useRef(false);

  // Mientras mostramos NUESTRO prompt de biometría hay que ignorar AppState.
  //
  // Esto no es paranoia: Android manda la app a 'background' cuando aparece el
  // BiometricPrompt. Sin esta bandera pasa lo siguiente, y lo vimos pasar:
  // el prompt manda la app a background -> el listener bloquea la sesión ->
  // aparece la pantalla de desbloqueo -> que pide la huella sola -> al
  // cerrarse ese prompt vuelve a mandar background -> bloquea otra vez. La app
  // queda pidiendo la huella para siempre, aunque la persona la pase bien.
  const promptAbierto = useRef(false);

  useEffect(() => {
    const averiguar = async () => {
      try {
        const [hardware, enrolada] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ]);
        setDisponible(hardware && enrolada);
        setActivada(await leerBiometriaActivada());
      } finally {
        setCargando(false);
      }
    };
    averiguar();
  }, []);

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
      if (promptAbierto.current) return; // es nuestro propio prompt, no la persona
      if (usuario !== null && activada && disponible) setBloqueada(true);
    });
    return () => suscripcion.remove();
  }, [usuario, activada, disponible]);

  // Pide la huella. Devuelve true si salió bien.
  //
  // disableDeviceFallback en false a propósito: si la huella no se lee (dedo
  // mojado, lector sucio), el sistema ofrece el PIN del dispositivo. Sin eso,
  // unos cuantos rechazos dejan a la persona afuera.
  const pedirHuella = async (mensaje) => {
    promptAbierto.current = true;
    try {
      const resultado = await LocalAuthentication.authenticateAsync({
        promptMessage: mensaje,
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });
      return resultado.success === true;
    } finally {
      // El evento de AppState del prompt llega DESPUÉS de que
      // authenticateAsync resuelve, así que soltamos la bandera un toque más
      // tarde. Si en ese segundo la persona manda la app a segundo plano a
      // mano, no se bloquea — es un caso raro y el precio de que no entre en
      // el loop.
      setTimeout(() => {
        promptAbierto.current = false;
      }, MS_GRACIA_PROMPT);
    }
  };

  // Activar pide la huella primero: así la persona comprueba en el momento que
  // funciona, en vez de descubrir recién al abrir la app que quedó afuera.
  const activar = async () => {
    const ok = await pedirHuella('Confirmá tu identidad para activar el desbloqueo');
    if (!ok) return false;
    await guardarBiometriaActivada(true);
    setActivada(true);
    return true;
  };

  // Desactivar no pide nada: para llegar a configuración ya hubo que entrar a
  // la app, así que la huella ya se validó.
  const desactivar = async () => {
    await guardarBiometriaActivada(false);
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
      value={{ disponible, activada, bloqueada, cargando, activar, desactivar, desbloquear }}
    >
      {children}
    </BiometriaContext.Provider>
  );
}
