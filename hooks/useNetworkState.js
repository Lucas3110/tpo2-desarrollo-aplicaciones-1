// Atajo para no repetir useContext(NetworkContext) en cada pantalla.
import { useContext } from 'react';
import { NetworkContext } from '../context/NetworkContext';

export function useNetworkState() {
  const contexto = useContext(NetworkContext);
  if (contexto === null) {
    throw new Error('useNetworkState se usa adentro de <NetworkProvider>');
  }
  return contexto;
}

