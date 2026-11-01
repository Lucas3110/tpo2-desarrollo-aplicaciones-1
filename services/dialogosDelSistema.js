// Los diálogos del sistema y el bloqueo por biometría.
//
// El problema: Android manda la app a 'background' cuando abre un diálogo
// suyo (el selector de galería, un permiso, el prompt de huella).
// BiometriaContext escucha ese evento para bloquear la sesión, y desde ahí
// no hay forma de distinguir "la persona se fue de la app" de "la persona
// abrió el selector de fotos". Resultado: elegís una foto y la app te pide
// la huella de la nada, en la mitad de la carga de una publicación.
//
// La solución es que quien abre el diálogo avise. Pero avisar desde cada
// pantalla es frágil: son seis lugares hoy y el que agregue el séptimo se
// va a olvidar. Así que el aviso vive acá, en los services que abren los
// diálogos, y no en las pantallas.
//
// El registro es el mismo patrón que usa apiClient con el cierre de sesión:
// el contexto de React deja su función acá al montarse, y este archivo la
// llama sin saber nada de React. Un service es JavaScript puro y no puede
// usar useContext.

let envolver = null;

// La llama BiometriaProvider al montarse.
export function registrarEnvoltorioDeDialogos(fn) {
  envolver = fn;
}

// Corre `hacer` avisando que hay un diálogo del sistema abierto.
//
// Si nadie se registró todavía, corre igual: que la biometría no esté lista
// no es razón para que no se pueda elegir una foto.
export async function conDialogoDelSistema(hacer) {
  if (envolver === null) return hacer();
  return envolver(hacer);
}
