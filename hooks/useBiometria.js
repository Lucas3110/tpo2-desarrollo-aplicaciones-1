// Atajo para no repetir useContext(BiometriaContext) en cada pantalla.
import { useContext } from 'react';
import { BiometriaContext } from '../context/BiometriaContext';

export function useBiometria() {
  const contexto = useContext(BiometriaContext);
  if (contexto === null) {
    throw new Error('useBiometria se usa adentro de <BiometriaProvider>');
  }
  return contexto;
}
