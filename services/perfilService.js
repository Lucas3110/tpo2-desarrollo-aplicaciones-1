// Punto 2: todo lo que la app le pide al backend sobre el perfil.
//
// JavaScript puro, sin JSX. Sale por apiClient como todo lo demás.
import apiClient from './apiClient';

// PUT /usuarios/me
//
// Reemplaza los datos personales: hay que mandar todos, no sólo el que
// cambió, porque un campo que no viaja queda vacío.
//
// Devuelve el usuario actualizado, que es lo que se guarda en la sesión.
export async function actualizarMisDatos({ nombre, telefono, barrioId, fotoUrl }) {
  const { data } = await apiClient.put('/usuarios/me', {
    nombre,
    telefono: telefono || null,
    zonaId: barrioId ?? null,
    fotoUrl: fotoUrl ?? null,
  });
  return data.usuario;
}
