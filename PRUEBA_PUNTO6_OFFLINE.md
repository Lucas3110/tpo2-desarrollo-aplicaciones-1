# Plan de prueba — Punto 6: modo sin conexión

## Antes de empezar
- MySQL (XAMPP), backend en el puerto 3000, Metro en el 8081.
- Emulador prendido, con `adb reverse tcp:3000 tcp:3000` y `adb reverse tcp:8081 tcp:8081`.
- App abierta, sesión iniciada con `perfil.demo@hallado.demo` / `demo1234`.
- Modo avión **apagado** al principio. Para activarlo: deslizar desde arriba y tocar "Modo avión".

## A. Con internet (llenar la caché)
| # | Paso | Resultado esperado |
|---|---|---|
| A1 | Buscador, "Perdí algo", sin filtros | Lista de resultados, sin avisos |
| A2 | Abrir 3 detalles distintos y volver a la lista | Fotos, barrio y descripción completos |
| A3 | Otra búsqueda con filtro, por ejemplo Llaves | Resultados filtrados |
| A4 | Con internet, mirar si hay cartel de "sin conexión" | No debe haber ninguno |

## B. Sin conexión: lectura
Activar el modo avión.

| # | Paso | Resultado esperado |
|---|---|---|
| B1 | Repetir la búsqueda de A1 | Últimos resultados y aviso de que pueden estar desactualizados |
| B2 | Abrir los 3 detalles de A2 | Completos, con fotos y barrio. Aviso de "copia guardada" |
| B3 | En el detalle, tocar "Es mío" o "Seguir" | Botones deshabilitados con mensaje claro |
| B4 | Abrir un detalle que nunca se vio | Mensaje claro de que no está disponible sin conexión, sin cuelgue ni pantalla en blanco |
| B5 | Búsqueda con un filtro que no se hizo con internet | Mensaje claro, sin error técnico |
| B6 | Revisar Mis reclamos, Alertas y Seguidas | Acciones deshabilitadas con mensaje, o datos guardados con aviso. La pantalla no se vacía |

## C. Sin conexión: crear una publicación
| # | Paso | Resultado esperado |
|---|---|---|
| C1 | Publicar, "Encontré algo": título "Prueba offline", categoría, barrio, fecha, franja, 1 foto de galería, pregunta y respuesta de verificación | Se puede completar todo |
| C2 | Confirmar | Mensaje de que quedó pendiente de envío, sin error |
| C3 | Ir a Mis publicaciones | La ficha figura como "pendiente de envío" |
| C4 | Cerrar la app y reabrirla, todavía sin red | La pendiente sigue ahí |
| C5 | Crear una segunda, de "Perdí algo", sin foto | También queda pendiente |

## D. Volver la conexión
| # | Paso | Resultado esperado |
|---|---|---|
| D1 | Desactivar el modo avión y esperar 10 a 30 segundos | Las pendientes se envían solas |
| D2 | Mis publicaciones | Las dos figuran como publicadas, ya no pendientes |
| D3 | Revisar duplicados | Una sola copia de cada una, en la lista y en la base |
| D4 | Abrir la que tenía foto | La foto se ve |

**Verificación desde la PC**
- Log del backend: tienen que aparecer `POST /api/hallado/fotos` y `POST /api/hallado/publicaciones`.
- Base de datos: `select id,titulo,tipo from hallado_publicaciones order by id desc limit 5;`
- Base local del emulador (`hallado_db.db`): `publicaciones_pendientes` queda vacía o con estado ya enviado.

## E. Casos borde
| # | Caso | Resultado esperado |
|---|---|---|
| E1 | Crear la pendiente y cerrar sesión antes de que vuelva la red | No se envía con otra cuenta y no se pierde sin avisar |
| E2 | Cortar la red en medio del envío (modo avión apenas vuelve la red) | Queda en reintento o con error recuperable, sin duplicar |
| E3 | Backend caído con internet activo (apagar `npm start`) | La app lo distingue de "sin internet" y no pierde la pendiente |
| E4 | Doble toque en "Publicar" | Una sola pendiente |
| E5 | Pendiente que el backend rechaza por validación | Muestra el error y permite editarla o eliminarla, sin quedar trabada |
| E6 | Perder la red a mitad de un refresco con datos en pantalla | La pantalla no se vacía |

## F. Regresión de los otros puntos
La capa offline toca `apiClient` y `AuthContext`, que usan todos.
- Login, logout y recupero de contraseña siguen funcionando.
- Detalle, reclamo, encuentro, alertas y perfil funcionan con internet.
- Un error real del backend con internet se muestra como error del backend, no como "sin conexión".

## Registro de resultados
Por cada fallo anotar: número del caso, qué se vio en pantalla y el mensaje del cartel o de la consola de Metro.

| Caso | OK / Falla | Observaciones |
|---|---|---|
| | | |
