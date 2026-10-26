# Contexto del proyecto — Hallado (TPO 2)

**Este documento está pensado para que lo leas vos o se lo pases a tu IA antes de escribir una línea.** Describe qué existe ya, con qué convenciones, y qué contratos no hay que romper.

Si vas a hacer un punto que todavía no está, buscá tu punto en la sección **"Lo que falta"**: ahí está lo que ya tenés resuelto y lo que tenés que construir.

---

## 1. Qué estamos haciendo

App de objetos y mascotas perdidas. Alguien publica que **perdió** algo, otro publica que **encontró** algo, y la app los cruza. Después hay reclamos, verificación, punto de encuentro y valoraciones.

**Stack, sin excepciones** (el profe lo pidió explícitamente):

- **React Native + Expo + JavaScript**. Nada de TypeScript.
- **`useContext`** para estado global. Nada de Redux ni Zustand.
- Backend Node + Express + MySQL, reutilizado de la entrega anterior.

**Entrega: 3 de noviembre**, los 10 puntos.

---

## 2. Los dos repos

| | Dónde | Qué |
|---|---|---|
| App | `tpo2-desarrollo-aplicaciones-1` | React Native + Expo |
| Backend | `tpo-ronda-backend` | Node + Express + MySQL. Es el de Ronda, ampliado |

El backend **no se evalúa con el mismo peso**, pero sin él la app no funciona. Las tablas nuevas llevan prefijo `hallado_` para no mezclarlas con las de Ronda, que siguen ahí sin usar.

---

## 3. Cómo levantarlo

```bash
npm install
cp .env.example .env
npm run android
```

### ⚠️ Si la app abre pero ningún pedido llega

Es lo primero que nos pasó a todos. Metro llega al emulador por un **túnel de adb** que Expo arma sólo para el 8081. El backend no tiene ese túnel y el firewall de Windows bloquea el 3000.

```bash
adb reverse tcp:3000 tcp:3000
```

Y en el `.env`: `EXPO_PUBLIC_API_URL=http://localhost:3000/api`

**Hay que correrlo cada vez que arranca el emulador.** Si `adb` no está en el PATH, está en `%LOCALAPPDATA%\Android\Sdk\platform-tools`.

### Otras dos cosas

- **Node 22.13 o mayor.** React Native 0.88 no soporta versiones anteriores.
- **Lanzá el emulador desde Android Studio** (Device Manager), no desde la consola: lanzado desde una terminal sin escritorio no compone la ventana y queda todo negro.

### Backend

```bash
npm run db:setup      # migraciones, idempotentes
npm run db:seed       # datos de prueba
npm start
npm run test:api      # 212 chequeos (correr db:seed antes)
```

> `test:api` necesita `db:seed` **antes de cada corrida**: la pasada anterior deja la publicación de prueba vendida.

---

## 4. Estructura y convenciones

La que propuso el profe en la clase 2:

```
components/   piezas de UI reutilizables, SIN lógica de negocio
screens/      una pantalla = un caso de uso
navigation/   definición de las navegaciones
services/     comunicación con el backend (axios). JS puro, sin JSX
hooks/        custom hooks
context/      estado global (useContext)
config/       constantes: URL del backend, colores, medidas
utils/        helpers y validaciones. JS puro
```

- **`.jsx`** para archivos que devuelven componentes, **`.js`** para JavaScript puro.
- Los comentarios explican **por qué**, no qué. Si una decisión no es obvia, está comentada arriba de la función.

### 🔴 Dos reglas que no se rompen

**1. La URL del backend sale de `config/env.js`.** Ningún service escribe una URL a mano. En la entrega anterior perdimos medio día porque un merge sin conflictos dejó una IP hardcodeada.

**2. Todos los pedidos salen por `services/apiClient.js`.** Ese cliente tiene los interceptores que pegan el token y traducen los errores. Si creás otro con `axios.create()`, **los pedidos salen sin token** y vas a perder una tarde buscando por qué da 401.

---

## 5. Lo que ya podés usar

### Componentes (`components/`)

| Componente | Para qué | Props principales |
|---|---|---|
| `Boton` | Botón con estado de carga | `titulo`, `onPress`, `cargando`, `variante` (`primario`\|`secundario`) |
| `CampoTexto` | Input con etiqueta y error | `etiqueta`, `error`, `ayuda`, + todo lo de `TextInput` |
| `Aviso` | Cartel de error/éxito/info | `mensaje`, `tipo` (`error`\|`exito`\|`info`) |
| `SelectorOpciones` | Fichas para 2–6 opciones | `opciones: [{valor, etiqueta, ayuda}]`, `valor`, `onElegir`, `columnas` |
| `SelectorLista` | Modal con buscador, para muchas opciones | `opciones: [{id, nombre}]`, `valor`, `onElegir` |
| `SelectorFotos` | Grilla de fotos + subida desde galería | `urls`, `onCambiar` |
| `PasosIndicador` | "Paso 2 de 4" con puntos | `paso`, `total`, `titulo` |
| `TarjetaResultado` | Una publicación en un listado | `publicacion`, `onPress` |
| `PantallaPendiente` | Placeholder de pantallas sin hacer | `pantallaPendiente(nombre, punto)` |

**Reusalos.** Están pensados para eso y hacen que la app se vea de una sola pieza.

### Contextos y hooks

```js
const { usuario, cargando, iniciarSesion, actualizarUsuario, cerrarSesion } = useAuth();
const { disponible, activada, bloqueada, activar, desactivar, desbloquear } = useBiometria();
```

> **Punto 2:** cuando edites el perfil, llamá a `actualizarUsuario(datos)` para que se refresque lo guardado.

### Services

| Archivo | Qué expone |
|---|---|
| `apiClient.js` | El cliente de axios. También `ErrorApi`, con `.codigo`, `.estado` y `.esDeConexion` |
| `authService.js` | registro, login, recupero, `/auth/me` |
| `publicacionService.js` | catálogos, crear, buscar, mías, renovar, eliminar, `urlDeFoto()` |
| `fotoService.js` | elegir de galería y subir |
| `ubicacionService.js` | `ubicacionActual()`, `direccionDeCoordenadas()`, `formatearCoordenadas()` |
| `sesionStorage.js` | token (SecureStore) y usuario (AsyncStorage) |
| `preferencias.js` | preferencias no secretas |
| `borradorService.js` | borrador de publicación |
| `historialBusquedasService.js` | últimas búsquedas |

### Utils

- **`utils/fechas.js`** — traduce entre `DD/MM/AAAA` (lo que escribe la persona) y `AAAA-MM-DD` (lo que habla el backend). `describirFecha()` devuelve "hoy", "ayer", "anteayer" o la fecha.

  > ⚠️ **Nunca uses `toISOString()` para armar una fecha.** Convierte a UTC y en Argentina te corre la fecha un día para atrás. Usá los helpers de este archivo.

- **`utils/validaciones.js`** — email, nombre, contraseña, código OTP. Devuelven el mensaje de error o `null`.

---

## 6. Cómo manejar errores (hacelo igual)

```js
try {
  const datos = await algunService();
  setDatos(datos);
} catch (e) {
  setError(e.message);     // ErrorApi ya trae el mensaje del backend
  // NO toques el estado con los datos: lo que ya estaba sigue en pantalla
}
```

**Tres criterios que seguimos en todas las pantallas:**

1. **Un refresco que falla no borra lo que ya estaba.** En Ronda pasaba al revés y al volver de un túnel la pantalla se vaciaba. El punto 6 va a necesitar lo mismo.
2. **El spinner grande sale sólo si no hay nada que mostrar.**
3. **`useFocusEffect` y no `useEffect`** cuando la pantalla tiene que refrescarse al volver a ella.

```js
useFocusEffect(useCallback(() => { cargar(); }, [deps]));
```

---

## 7. Base de datos

Tablas **reutilizadas** de Ronda: `usuarios`, `codigos_otp`, `zonas` (= los barrios del enunciado).

Tablas **nuevas**:

### `hallado_categorias`
Documentos, Llaves, Electronica, Mascotas, Ropa, Otros.

### `hallado_publicaciones` — 🔴 el contrato central

```
id, usuario_id
tipo                      ENUM('PERDI','ENCONTRE')
categoria_id              → hallado_categorias
titulo                    VARCHAR(80)
descripcion               TEXT NULL
fecha_suceso              DATE
franja_horaria            ENUM('MANANA','TARDE','NOCHE','NO_SE')
barrio_id                 → zonas
direccion                 VARCHAR(255) NULL   ← NO se expone sin reclamo aceptado
lat, lng                  DECIMAL NULL        ← o las dos o ninguna (hay CHECK)
pregunta_verificacion     VARCHAR(255) NULL   ← sólo en ENCONTRE
respuesta_verificacion    VARCHAR(255) NULL   ← NUNCA sale en un DTO
estado                    ENUM('ABIERTA','EN_RECLAMO','RESUELTA','VENCIDA')
vence_en                  DATETIME            ← 30 días, renovable
```

### `hallado_fotos`
`publicacion_id`, `url`, `orden`. Varias por publicación.

### 🔴 Tres cosas del esquema que no hay que romper

**El estado VENCIDA no se guarda, se deduce.** Siempre usá:

```sql
IF(p.estado = 'ABIERTA' AND p.vence_en < NOW(), 'VENCIDA', p.estado) AS estado_efectivo
```

Guardarlo obligaría a una tarea programada que marque las vencidas todas las noches; si no corre una vez, la app miente.

**La dirección exacta no se expone** hasta que el reclamo esté aceptado. El DTO lo controla con `verDireccion`, cuyo **default es `false`**.

**La respuesta de verificación no sale en ningún DTO.** Se guarda normalizada (minúsculas, sin acentos, sin espacios de sobra) para poder compararla con tolerancia. Hay un test que la busca en el JSON entero de la respuesta.

---

## 8. Endpoints que existen

Todos cuelgan de `/api/hallado`. Los marcados con 🔒 piden `Authorization: Bearer <token>`.

```
GET    /categorias                      catálogo
GET    /barrios                         catálogo (son las zonas)
GET    /publicaciones                   buscador (punto 3)
🔒 POST   /fotos                        subir una foto
🔒 POST   /publicaciones                crear
🔒 GET    /publicaciones/mias           ?estado=
🔒 GET    /publicaciones/:id/propia     ficha privada, sólo del dueño
🔒 PATCH  /publicaciones/:id            editar
🔒 POST   /publicaciones/:id/renovar    +30 días
🔒 DELETE /publicaciones/:id
```

Y de auth, en `/api/auth`:

```
POST /registro/solicitar      { email }
POST /registro/confirmar      { email, codigo, nombre, password }
POST /login                   { email, password }
POST /password/recuperar      { email }
POST /password/restablecer    { email, codigo, password }
GET  /me                      🔒
```

### 🔴 El buscador: `queTePaso` devuelve el tipo OPUESTO

```
GET /hallado/publicaciones
  queTePaso    PERDI | ENCONTRE   (obligatorio) ← lo que te pasó a VOS
  q            palabras clave
  categoriaId, barrioId
  cuando       HOY | TRES_DIAS | SEMANA | RANGO (+ desde, hasta)
  orden        RECIENTES | CERCANOS
  lat, lng     desde dónde medir la cercanía
  pagina, limite
```

Si mandás `queTePaso=PERDI`, te devuelve publicaciones de tipo **ENCONTRE**. Es lo que pide el enunciado y por eso el parámetro se llama así: si se llamara `tipo`, alguien lo mandaría al derecho y el error sería invisible.

### Forma de los errores

```json
{ "error": { "codigo": "ALGO_INVALIDO", "mensaje": "Texto para mostrar" } }
```

El `apiClient` ya lo traduce a un `ErrorApi` con `.message` mostrable y `.codigo` para casos especiales.

---

## 9. Lo que ya está hecho

| Punto | Estado |
|---|---|
| **1 — Autenticación** | ✅ registro con OTP, login, recupero, biometría |
| **3 — Buscador y resultados** | ✅ buscador guiado, resultados con refinar/ordenar/paginado, últimas búsquedas |
| **5 — Publicar** | ✅ carga guiada, fotos, ubicación, borrador, mis publicaciones |

Backend: **212 chequeos automáticos pasando** (`npm run test:api`).

---

## 10. Lo que falta — buscá tu punto acá

Todas las pantallas **ya están registradas** en `navigation/MainNavigator.jsx`. Las que faltan apuntan a `pantallaPendiente()`. Para hacer la tuya: creás la pantalla y cambiás el `component`. **No toques las de otros**, así no se pisan los merges.

```js
// antes
<Stack.Screen name="Perfil" component={pantallaPendiente('Mi perfil', 2)} ... />
// después
<Stack.Screen name="Perfil" component={PerfilScreen} ... />
```

---

### Punto 2 — Perfil y reputación
**Pantallas:** `Perfil`, `PerfilPublico`

**Ya tenés:** `usuarios` con `nombre`, `telefono`, `zona_id`, `foto_url`. El `usuarioService.js` de Ronda con editar perfil y perfil público. `actualizarUsuario()` del `AuthContext`. `POST /hallado/fotos` para la foto de perfil. `GET /hallado/barrios`.

**Te falta construir:**
- Ver y editar nombre, foto, barrio y teléfono
- **El toggle de si el teléfono es visible** una vez aceptado un reclamo → columna nueva en `usuarios`
- Reputación a partir de devoluciones concretadas y valoraciones (el punto 10 las escribe)
- **Insignias** al alcanzar metas, ej. "Vecino solidario" a las 5 devoluciones
- El perfil público muestra reputación, insignias y antigüedad, **pero NO el teléfono ni el historial**

> ⚠️ Coordiná con quien haga el 10: vos **leés** los contadores de reputación, él los **escribe**.

---

### Punto 4 — Detalle de la publicación
**Pantalla:** `DetallePublicacion` — recibe `route.params.id`

**🔴 Es el punto que más desbloquea.** Hoy tocar un resultado lleva a un placeholder.

**Ya tenés:** `hallado_publicaciones` y `hallado_fotos` completas. `GET /publicaciones/:id/propia` como referencia. El DTO `toPublicacionDto` con el parámetro `verDireccion`. `urlDeFoto()` para las imágenes.

**Te falta construir:**
- `GET /hallado/publicaciones/:id` **público** (el que existe es sólo del dueño)
- Galería con todas las fotos, descripción, categoría, fecha y franja, estado y barrio
- Datos del publicador con su reputación y acceso a su perfil público (punto 2)
- Acciones según quién mira:
  - en una de **ENCONTRE**, un tercero ve **"Es mío"** → punto 7
  - en una de **PERDI**, un tercero ve **"Lo encontré"** → punto 7
  - cualquiera puede **seguir** la publicación → punto 9
  - si es el propio publicador, ve la gestión
- **🔴 La dirección exacta NO se muestra hasta que el reclamo esté aceptado.** Usá `verDireccion` del DTO; el default ya es `false`.

---

### Punto 7 — Reclamos y verificación
**Pantallas:** `Reclamar`, `MisReclamos`

**Ya tenés:** `pregunta_verificacion` y `respuesta_verificacion` en la publicación, la respuesta ya normalizada. El estado `EN_RECLAMO`. `POST /hallado/fotos` para las fotos del reclamo.

**Te falta construir:**
- Tabla `hallado_reclamos`: publicación, reclamante, respuesta dada, descripción, fotos, estado, vencimiento
- Quien dice **"Es mío"** contesta la pregunta de verificación (+ descripción y foto opcionales)
- Quien dice **"Lo encontré"** adjunta foto y barrio — **no hay pregunta** en ese caso, porque la carga quien encontró
- El publicador acepta o rechaza
- **Máximo 3 intentos** por persona por publicación
- Estados: pendiente, aceptado, rechazado, vencido. **Vence a las 48 h** sin respuesta
- Sección "Mis reclamos" con los enviados y los recibidos

> 💡 Para comparar la respuesta, reusá `normalizarRespuesta()` de `halladoPublicarService.js`. Ya está exportada. Si comparás el texto crudo, "Azul" y "azul" van a dar incorrecto.
>
> 💡 El vencimiento a 48 h: hacelo **deducido** como el de las publicaciones, no con una tarea programada.

---

### Punto 8 — Devolución y punto de encuentro
**Pantalla:** `PuntoDeEncuentro`

**Ya tenés:** `lat`/`lng` en la publicación. `ubicacionService.js` para tomar coordenadas. El código de "Cómo llegar" de Ronda como referencia.

**Te falta construir:**
- Tabla para el punto de encuentro propuesto
- Quien tiene el objeto propone un punto; la otra parte acepta o **sugiere uno alternativo**
- Botón **"Cómo llegar"** que abre Google Maps en modo navegación con la dirección precargada → `Linking.openURL()`
- Al concretarse, la publicación pasa a **RESUELTA** y se genera el caso para el punto 10

---

### Punto 9 — Alertas y seguidas
**Pantallas:** `MisAlertas`, `Seguidas`

**🔴 Las alertas NO son las "últimas búsquedas" del punto 3.** Son dos cosas distintas:

| | |
|---|---|
| Últimas búsquedas (punto 3, hecho) | se guardan **solas**, son **locales**, para repetir lo que acabás de buscar |
| **Alertas (tu punto)** | las guarda la persona **a propósito**, viven en el **backend**, avisan cuando aparece algo nuevo |

**Ya tenés:** el buscador que arma los criterios. En `ResultadosScreen` el estado vacío ya tiene el botón **"Avisarme si aparece"** apuntando a `MisAlertas`. `busquedas_guardadas` de Ronda como referencia.

**Te falta construir:**
- Guardar una búsqueda como alerta con todos sus criterios (tipo, categoría, barrio, palabras clave)
- "Mis alertas": ver, **pausar** y eliminar, con **la cantidad de publicaciones nuevas** que coinciden con cada una
- "Seguidas": las publicaciones que la persona sigue
- **Indicador visual de novedad** cuando aparece algo que coincide, o cuando una seguida cambia de estado

---

### Punto 10 — Historial y valoraciones
**Pantalla:** `Historial`

**Ya tenés:** `operaciones` y `calificaciones` de Ronda como referencia. El punto 8 genera los casos resueltos.

**Te falta construir:**
- Historial separado en **"Devolví"** y **"Recuperé"**, con fecha, objeto y contraparte
- Filtro por rango de fechas y por tipo
- **Dentro de los 7 días** posteriores, cada parte valora a la otra (positiva o negativa) + mensaje breve opcional
- Quien recuperó puede dejar un **agradecimiento público**, visible en el perfil de quien se lo devolvió
- Las valoraciones alimentan la reputación → **coordiná con el punto 2**

---

### Punto 6 — Modo sin conexión
**No es una pantalla: es una capa sobre las pantallas de todos.** Conviene hacerlo **al final**, cuando lo demás esté mergeado.

**Lo que pide:**
- Conservar las últimas publicaciones consultadas (detalle, fotos y barrio)
- Una búsqueda sin conexión muestra los últimos resultados cargados, **con aviso de que puede no estar actualizada**
- **Crear una publicación sin conexión**, que queda "pendiente de envío" y se publica sola al volver la conexión
- Las acciones que requieren conexión quedan **deshabilitadas con un mensaje claro**

**Ya tenés a favor:**
- El criterio de "un refresco que falla no borra lo que estaba" ya aplicado en todas las pantallas
- `ErrorApi.esDeConexion` para distinguir "sin internet" de "el backend dijo que no"
- El borrador de publicación ya es local, así que funciona sin conexión
- El historial de búsquedas también es local

**⚠️ Esto necesita WatermelonDB**, que **no funciona en Expo Go**. Cuando lo agregues, **todo el equipo** tiene que pasar a development build:

```bash
npx expo run:android
```

La primera vez tarda 10–15 minutos. **Avisá antes de hacerlo**, no después.

---

## 11. Cómo trabajamos

Una rama por feature, PR, y recién ahí a `main`. **PRs chicos**: es más fácil revisar cuatro de cien líneas que uno de cuatrocientas, y el profe evalúa las contribuciones de cada uno en GitHub.

```
feature/punto4-detalle-publicacion
feature/punto7-reclamos
```

El mensaje del commit explica **por qué**, no qué. Mirá los que hay para ver el formato.

---

## 12. Alcance: lo que el profe dejó afuera

En la clase 4 dijo textual:

> *"En algún lado habla de sacar foto y demás, **ómitanlo**, son imágenes que pueden tomar de la galería. Todo lo que sea cámara lo vamos a ver la clase que viene. **No va a entrar nada de cámara para el segundo enunciado**."*

- **Cámara: afuera.** Las fotos salen de la galería, con `expo-image-picker`.
- **Notificaciones push: afuera.** No están en el enunciado y él lo confirmó.

### Librerías que usamos

Todas son las que el profe usó en su repo, más `expo-image-picker` y `expo-location`, que dio en la clase 4:

```
@react-navigation/native, @react-navigation/native-stack
react-native-screens, react-native-safe-area-context
axios
@react-native-async-storage/async-storage
expo-secure-store, expo-local-authentication
expo-image-picker, expo-location
```

**Antes de sumar una librería nueva, pensalo dos veces.** Si el profe no la dio, hay que poder justificar por qué hacía falta. Por ejemplo: no usamos `@react-navigation/bottom-tabs` para el menú ni un date picker para las fechas — se resolvieron con lo que ya había.
