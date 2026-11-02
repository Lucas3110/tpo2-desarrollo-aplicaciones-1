// Punto 6: estado global de la conexión y sincronización automática de la
// cola de publicaciones pendientes.
//
// Vive en un Context (igual que AuthContext y BiometriaContext) para que
// cualquier pantalla pueda saber si hay internet sin abrir suscripciones
// duplicadas a NetInfo, y para que el envío de pendientes ocurra en segundo
// plano sin importar en qué pantalla esté parada la persona.
import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../hooks/useAuth';
import {
  CAUSA_SERVIDOR,
  CAUSA_SIN_RED,
  registrarCambioDeConexion,
} from '../services/apiClient';
import {
  contarPublicacionesPendientes,
  sincronizarPublicacionesPendientes,
} from '../services/offlineSyncService';
import { obtenerBarrios, obtenerCategorias } from '../services/publicacionService';

export const NetworkContext = createContext(null);

function tieneInternet(estadoRed) {
  if (!estadoRed) return true;
  // Mismo criterio que el interceptor de apiClient: solo importa que haya
  // red. `isInternetReachable` se ignora porque con el backend en localhost/LAN
  // puede ser `false` (o `null` en el arranque) aunque el servidor responda.
  // Si el servidor está caído, apiClient lo avisa con `SIN_CONEXION`.
  return estadoRed.isConnected !== false;
}

export function NetworkProvider({ children }) {
  const { usuario } = useAuth();

  const [conectado, setConectado] = useState(true);
  // Cuando `conectado` es false: true si el teléfono TIENE red pero el servidor
  // no responde (apagado, caído), false si directamente no hay red. Sirve para
  // no decirle "no hay internet" a alguien que tiene WiFi.
  const [servidorCaido, setServidorCaido] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [pendientesCount, setPendientesCount] = useState(0);

  // Guardamos el estado anterior para detectar el momento exacto en que
  // vuelve la red (false -> true) y disparar la cola de salida.
  const estabaConectado = useRef(true);
  const sincronizandoRef = useRef(false);

  const refrescarContadorPendientes = useCallback(async () => {
    if (!usuario?.id) {
      setPendientesCount(0);
      return;
    }
    const total = await contarPublicacionesPendientes(usuario.id);
    setPendientesCount(total);
  }, [usuario?.id]);

  const sincronizarAhora = useCallback(async () => {
    if (!usuario?.id || sincronizandoRef.current) return;

    sincronizandoRef.current = true;
    setSincronizando(true);
    try {
      const { enviadas } = await sincronizarPublicacionesPendientes(usuario.id);
      if (enviadas > 0) {
        estabaConectado.current = true;
        setConectado(true);
      }
    } finally {
      await refrescarContadorPendientes();
      sincronizandoRef.current = false;
      setSincronizando(false);
    }
  }, [usuario?.id, refrescarContadorPendientes]);

  useEffect(() => {
    refrescarContadorPendientes();
  }, [refrescarContadorPendientes]);

  // También escuchamos el resultado real de `apiClient`: si alguien prueba el
  // modo offline apagando el backend (sin tocar el Modo Avión del emulador),
  // el primer fallo `SIN_CONEXION` pasa `conectado` a `false`, y cuando el
  // backend vuelve a responder pasa a `true` y dispara la cola pendiente.
  useEffect(() => {
    registrarCambioDeConexion((alcanzable, causa) => {
      const volvio = !estabaConectado.current && alcanzable;
      estabaConectado.current = alcanzable;
      setConectado(alcanzable);
      setServidorCaido(!alcanzable && causa === CAUSA_SERVIDOR);
      if (volvio) {
        sincronizarAhora();
      }
    });
    return () => {
      registrarCambioDeConexion(null);
    };
  }, [sincronizarAhora]);

  useEffect(() => {
    const desuscribir = NetInfo.addEventListener((estado) => {
      const onlineAhora = tieneInternet(estado);
      const volvioLaRed = !estabaConectado.current && onlineAhora;

      estabaConectado.current = onlineAhora;
      setConectado(onlineAhora);
      // Sin red el motivo es la red, no el servidor.
      if (!onlineAhora) setServidorCaido(false);

      if (volvioLaRed) {
        sincronizarAhora();
      }
    });

    NetInfo.fetch().then((estado) => {
      const online = tieneInternet(estado);
      estabaConectado.current = online;
      setConectado(online);
      if (online) {
        sincronizarAhora();
      }
    });

    return () => {
      desuscribir();
    };
  }, [sincronizarAhora]);

  // Precarga de catálogos: mientras hay conexión y sesión, guardamos las
  // categorías y barrios REALES en AsyncStorage. Así, si la persona abre
  // "Publicar" sin internet, usa los ids verdaderos del servidor y no una
  // lista inventada.
  useEffect(() => {
    if (!conectado || !usuario?.id) return;
    Promise.all([obtenerCategorias(), obtenerBarrios()]).catch(() => {
      // Si falla, las pantallas vuelven a pedirlos cuando las abren.
    });
  }, [conectado, usuario?.id]);

  // Si quedaron publicaciones pendientes (por ejemplo porque se apagó el
  // backend pero el Wi-Fi del emulador seguía prendido), reintentamos cada
  // 8 segundos mientras el dispositivo tenga red.
  useEffect(() => {
    if (pendientesCount === 0 || !usuario?.id) return undefined;

    const intervalo = setInterval(async () => {
      const estado = await NetInfo.fetch().catch(() => null);
      if (tieneInternet(estado)) {
        sincronizarAhora();
      }
    }, 8000);

    return () => clearInterval(intervalo);
  }, [pendientesCount, usuario?.id, sincronizarAhora]);

  return (
    <NetworkContext.Provider
      value={{
        conectado,
        sinConexion: !conectado,
        // null si hay conexión; 'SERVIDOR' si hay red pero el servidor no
        // responde; 'SIN_RED' si el teléfono no tiene red.
        motivoOffline: conectado ? null : servidorCaido ? CAUSA_SERVIDOR : CAUSA_SIN_RED,
        sincronizando,
        pendientesCount,
        sincronizarAhora,
        refrescarContadorPendientes,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}
