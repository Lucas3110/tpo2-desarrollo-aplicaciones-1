# Punto 8: app

Entrada: Menú > Mis reclamos > un reclamo aceptado > Punto de encuentro.
La ruta recibe `{ reclamoId }` y usa `services/encuentroService.js` a través del
cliente HTTP compartido. Los permisos vienen del backend; no se decide el rol
según quién publicó solamente.

La pantalla propone, contrapropone, acepta y confirma la entrega. Al volver
se refresca con `useFocusEffect`; también tiene Actualizar y gesto de refresco.
Un error de conexión conserva lo que estaba visible y deshabilita las acciones
remotas hasta actualizar. Esto no implementa el almacenamiento offline general
del punto 6.

Cómo llegar usa la dirección del encuentro, o sus coordenadas opcionales. En
Android intenta `google.navigation:`; si falla abre la URL web de Maps con
`dir_action=navigate`. El navegador puede mostrar la ruta en lugar de iniciar
navegación paso a paso, dependiendo del dispositivo. No requiere clave de Maps.
Referencias: https://developer.android.com/guide/components/google-maps-intents
y https://developers.google.com/maps/documentation/urls/get-started

Si se edita la dirección después de tomar GPS, se descartan esas coordenadas
para que Maps no siga apuntando al lugar anterior.

## Comprobación manual en Android

1. Ana propone un lugar con dirección y localidad.
2. Bruno ve la propuesta y sugiere otra.
3. Ana actualiza y acepta la alternativa.
4. Ambos pueden abrir Cómo llegar.
5. Confirmar devolución, cancelar una vez y luego confirmarla.
6. Ver el caso en Historial y dejar una valoración.
7. Repetir con un caso PERDI: quien encontró sigue siendo quien propone primero.
8. Apagar backend, actualizar y comprobar que permanece la dirección con aviso.
9. Reactivar backend y actualizar para volver a habilitar acciones.
10. Denegar GPS: el mensaje permite continuar escribiendo la dirección.

El backend correspondiente debe incluir la migración 18. Ver `PUNTO8.md` del
backend para el contrato y los cambios de integración.
