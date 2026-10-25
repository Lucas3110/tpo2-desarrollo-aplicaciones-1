// Atajo para no repetir useContext(AuthContext) en cada pantalla.
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (contexto === null) {
    throw new Error('useAuth se usa adentro de <AuthProvider>');
  }
  return contexto;
}
