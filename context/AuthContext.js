// Estado global de la sesion. Usamos useContext y no Redux porque para
// guardar quien esta logueado alcanza y sobra (y es lo que vimos en clase).
//
// Este contexto solo administra la sesion: guardarla, restaurarla y
// borrarla. Los pedidos al backend (registro, OTP, login, recupero) viven
// en services/authService.js, que es parte del punto 1.
import { createContext, useEffect, useState } from 'react';
import {
  borrarToken,
  borrarUsuario,
  guardarToken,
  guardarUsuario,
  leerToken,
  leerUsuario,
} from '../services/sesionStorage';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  // Arranca en true: hasta que no sepamos si habia sesion guardada no
  // podemos decidir que pantalla mostrar, o se veria el login un instante
  // antes de entrar al home.
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const restaurarSesion = async () => {
      try {
        const token = await leerToken();
        if (token) {
          setUsuario(await leerUsuario());
        }
      } finally {
        setCargando(false);
      }
    };
    restaurarSesion();
  }, []);

  // La llama el punto 1 cuando el backend devolvio token + usuario.
  const iniciarSesion = async (token, datosUsuario) => {
    await guardarToken(token);
    await guardarUsuario(datosUsuario);
    setUsuario(datosUsuario);
  };

  // Para cuando se edita el perfil (punto 2) y hay que refrescar lo guardado.
  const actualizarUsuario = async (datosUsuario) => {
    await guardarUsuario(datosUsuario);
    setUsuario(datosUsuario);
  };

  const cerrarSesion = async () => {
    await borrarToken();
    await borrarUsuario();
    setUsuario(null);
  };

  return (
    <AuthContext.Provider
      value={{ usuario, cargando, iniciarSesion, actualizarUsuario, cerrarSesion }}
    >
      {children}
    </AuthContext.Provider>
  );
}
