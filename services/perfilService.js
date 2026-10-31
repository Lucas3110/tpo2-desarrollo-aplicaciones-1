// Punto 2: todo lo que la app le pide al backend sobre el perfil.
//
// JavaScript puro, sin JSX. Sale por apiClient como todo lo demás.
import apiClient from './apiClient';

// PUT /usuarios/me
//
// Reemplaza los datos personales: hay que mandar todos, no sólo el que
// cambió, porque un campo que no viaja queda vacío. La excepción es
// telefonoVisible: si no viaja, el backend lo deja como estaba.
//
// Devuelve el usuario actualizado, que es lo que se guarda en la sesión.
export async function actualizarMisDatos({ nombre, telefono, barrioId, fotoUrl, telefonoVisible }) {
  const { data } = await apiClient.put('/usuarios/me', {
    nombre,
    telefono: telefono || null,
    zonaId: barrioId ?? null,
    fotoUrl: fotoUrl ?? null,
    telefonoVisible,
  });
  return data.usuario;
}

// Arma el pedido de arriba a partir del usuario de la sesión, para cuando
// sólo cambia una cosa (por ejemplo, la visibilidad del teléfono).
export function datosDe(usuario) {
  return {
    nombre: usuario.nombre,
    telefono: usuario.telefono,
    barrioId: usuario.zona?.id ?? null,
    fotoUrl: usuario.fotoUrl,
    telefonoVisible: usuario.telefonoVisible,
  };
}
