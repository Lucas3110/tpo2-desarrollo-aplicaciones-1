// Estado global de la sesión. Usamos useContext y no Redux porque para
// guardar quién está logueado alcanza y sobra (y es lo que vimos en clase).
//
// Este contexto administra la sesión: guardarla, restaurarla y borrarla. Los
// pedidos al backend viven en services/authService.js.
import { createContext, useEffect, useState } from 'react';
import { obtenerPerfil } from '../services/authService';
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
  // Arranca en true: hasta que no sepamos si había sesión guardada no podemos
  // decidir qué pantalla mostrar, o se vería el login un instante antes de
  // entrar al home.
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    restaurarSesion();
    // Solo al arrancar la app.
  }, []);

  async function restaurarSesion() {
    try {
      const token = await leerToken();
      if (!token) return;

      // Primero pintamos con lo que teníamos guardado, así la app abre
      // enseguida y no se queda en el spinner esperando al backend.
      const guardado = await leerUsuario();
      if (guardado) setUsuario(guardado);

      // Y después preguntamos cómo está el usuario ahora. Esto sirve para dos
      // cosas: refrescar los datos si cambiaron, y darnos cuenta de que el
      // token venció.
      try {
        const { usuario: fresco } = await obtenerPerfil();
        await guardarUsuario(fresco);
        setUsuario(fresco);
      } catch (e) {
        if (e.estado === 401) {
          // El token venció o no sirve más. Limpiamos: dejarlo sería mostrar
          // la app con una sesión muerta, y cada pantalla fallaría sola.
          await limpiar();
        } else if (!guardado) {
          // No pudimos preguntar y tampoco tenemos nada guardado, así que no
          // hay con qué dibujar la app. Al login.
          await limpiar();
        }
        // Si hay datos guardados y el error fue de conexión, nos quedamos con
        // lo guardado: sin internet la sesión tiene que seguir en pie.
      }
    } finally {
      setCargando(false);
    }
  }

  async function limpiar() {
    await borrarToken();
    await borrarUsuario();
    setUsuario(null);
  }

  // La llaman el login y el registro cuando el backend devolvió token + usuario.
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

  const cerrarSesion = limpiar;

  return (
    <AuthContext.Provider
      value={{ usuario, cargando, iniciarSesion, actualizarUsuario, cerrarSesion }}
    >
      {children}
    </AuthContext.Provider>
  );
}
