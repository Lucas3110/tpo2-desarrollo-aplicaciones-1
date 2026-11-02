// Aviso para pantallas cuya acción principal necesita conexión (guardar,
// enviar, pausar, eliminar...). No aparece si hay conexión.
//
// Va junto a un botón o enlace deshabilitado con `!conectado`: un botón gris sin
// explicación parece roto, así que siempre se acompaña de este texto.
//
// `accion` completa la frase "Necesitás conexión para ...", por ejemplo
// "guardar los cambios". El texto cambia si el problema es el servidor y no la red.
import Aviso from './Aviso';
import { useNetworkState } from '../hooks/useNetworkState';
import { TEXTOS } from '../utils/mensajesConexion';

export default function AvisoRequiereConexion({ accion }) {
  const { conectado, motivoOffline } = useNetworkState();
  if (conectado) return null;
  return <Aviso tipo="info" mensaje={TEXTOS.necesitaConexion(motivoOffline, accion)} />;
}
