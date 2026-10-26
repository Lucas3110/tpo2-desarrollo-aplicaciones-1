# Guía para el coloquio — puntos 1, 3 y 5

El profe evalúa el coloquio **a partir de tus contribuciones en GitHub**: mira qué commits son tuyos y te pregunta sobre eso. Así que esto no es un resumen de la app entera, son **las partes que hiciste vos** y por qué están hechas así.

Está ordenado por el archivo que tenés que abrir para contestar. Si no entendés una respuesta, abrí el archivo que dice al lado: el comentario de arriba de cada función dice lo mismo pero más largo.

---

## Parte 0 — Lo que te puede preguntar de React Native en general

Estos no son de tu código, son de la materia, pero caen seguro porque el profe los marcó como "pregunta de examen" en clase.

### ¿Por qué el `NavigationContainer` va en `App.js` y no adentro de una pantalla?

> **Archivo: `App.js`**

React es un árbol de componentes. `NavigationContainer` guarda el estado de la navegación y lo comparte hacia abajo por contexto. Si estuviera en el medio del árbol, las pantallas que quedan por fuera de él no podrían navegar.

El profe lo dijo así en la clase 3: *"si no lo hago en el proyecto de más arriba, en todo lo que es el árbol de componentes, eso no me va a funcionar"*.

### ¿De dónde sale el prop `navigation` que usan todas las pantallas?

> **Archivo: cualquier pantalla, ej. `screens/buscador/BuscadorScreen.jsx` línea 1 de la función**

No lo pasamos nosotros. **Lo inyecta React Navigation** a todo componente que esté registrado como `<Stack.Screen component={...}>`. Por eso un componente suelto no lo tiene: para usar la navegación desde ahí hay que usar el hook `useNavigation`.

### ¿Por qué `useContext` y no Redux?

> **Archivo: `context/AuthContext.js`**

Porque lo único que necesitamos compartir globalmente es **quién está logueado** y **si la sesión está bloqueada**. Redux es una arquitectura entera (store, actions, reducers, middleware) pensada para estados grandes y con mucha lógica de transición.

El profe fue explícito: *"con context nos basta y sobra para poder manejar un estado global [...] no tanto redux"*.

### ¿Qué es un `useEffect` y por qué le ponés dependencias?

`useEffect(fn, [deps])` corre `fn` después de renderizar, y lo vuelve a correr **sólo si cambió alguna de las dependencias**. Con `[]` corre una sola vez, al montarse el componente.

Mirá `BiometriaContext.js`: hay tres `useEffect` distintos y cada uno tiene dependencias distintas porque cada uno reacciona a algo distinto. El primero (`[]`) pregunta una vez si el dispositivo tiene lector. El segundo reacciona a que cambie la sesión. El tercero re-suscribe el listener de `AppState` cuando cambia alguna condición.

### ¿Por qué los estilos son un objeto de JavaScript y no CSS?

Porque no hay navegador. `StyleSheet.create` es un objeto JS que React Native traduce a propiedades nativas de Android. Por eso tampoco se escribe `border-radius` sino `borderRadius`: un guión no es válido en una clave de objeto JS.

---

## Parte 1 — Punto 1: autenticación

### ¿Por qué el registro pide la contraseña al final y no al principio?

> **Archivos: `screens/auth/RegistroEmailScreen.jsx` y `VerificarCodigoScreen.jsx`**

Porque el enunciado lo pide en ese orden: *"solicitar email → recibir un código de validación (OTP) → confirmarlo y definir una contraseña"*. La contraseña se elige **después** de probar que el email es tuyo.

El backend que veníamos reusando de Ronda lo hacía al revés (pedía todo junto), así que agregué dos endpoints nuevos: `/auth/registro/solicitar` y `/auth/registro/confirmar`.

**Pregunta difícil que te pueden hacer:** *"¿No es inseguro que exista una cuenta sin contraseña?"*
No, por dos razones. Primero, `login()` rechaza a cualquier usuario cuyo `password_hash` sea `NULL`. Segundo, mientras no se confirme el código, `email_verificado` sigue en 0 y tampoco se puede entrar. La cuenta existe pero no sirve para nada hasta que se completa el paso 2.

### ¿Por qué el código, el nombre y la contraseña están en la misma pantalla?

Por dos razones, y la segunda es la buena:

1. El enunciado los agrupa: *"confirmarlo **y** definir una contraseña"*.
2. El backend consume el código y guarda los datos **en el mismo pedido**. Si estuvieran en pantallas separadas, la persona tipearía nombre y contraseña para enterarse **recién después** de que el código estaba mal.

### ¿Por qué el login no dice si el email no existe?

> **Archivo: `screens/auth/LoginScreen.jsx`, función `ingresar`**

El backend contesta el mismo mensaje genérico ("Email o contraseña incorrectos") en los dos casos. Si dijera "ese email no existe", alguien podría averiguar qué emails tienen cuenta probando de a uno. Eso se llama **enumeración de usuarios**.

La excepción es `EMAIL_NO_VERIFICADO`: ahí la cuenta sí existe, y decirle "incorrectos" sería mentirle. En ese caso aparece un enlace para pedir otro código.

### ¿Por qué de la contraseña sólo validás que no esté vacía?

Porque decirle "al menos 6 caracteres" en el **login** estaría mal: si la cuenta se creó cuando el mínimo era otro, esa contraseña sigue siendo la correcta. El mínimo se valida al **crear**, no al entrar.

### ¿Dónde guardás el token y por qué ahí?

> **Archivo: `services/sesionStorage.js`**

| Qué | Dónde | Por qué |
|---|---|---|
| Token | `expo-secure-store` | Es cifrado por el sistema operativo. Es el equivalente del `EncryptedSharedPreferences` que usamos en Android nativo |
| Datos del usuario | `AsyncStorage` | Nombre y email no son secretos. Se guardan para poder pintar la pantalla antes de que conteste el backend |

### ¿Cómo sabe la app que el token venció?

> **Archivo: `context/AuthContext.js`, función `restaurarSesion`**

Al arrancar hace dos cosas, en este orden:

1. Pinta con lo que había guardado → la app abre enseguida, sin quedarse en el spinner.
2. Llama a `GET /auth/me` para refrescar.

Si `/auth/me` contesta **401**, el token venció y se limpia la sesión. Si el error es **de conexión** y hay datos guardados, se queda con los guardados: sin internet la sesión tiene que seguir en pie.

> Esa distinción entre "401" y "sin conexión" es la misma que va a necesitar el punto 6.

### ¿Cuándo pide la huella y cuándo no?

> **Archivo: `context/BiometriaContext.js`** — leé el comentario de arriba, lo explica entero.

Se bloquea en **dos** momentos:

1. Al abrir la app con una sesión que venía guardada.
2. Cuando la app se va a segundo plano (botón de home, cambiar de app).

**No** se bloquea cuando la persona acaba de loguearse o registrarse: ya probó quién es con la contraseña o el código.

Para distinguir "sesión restaurada" de "recién se logueó" miramos `cargando` de `AuthContext` con un `useRef` llamado `yaArranco`. Mientras `cargando` es `true` estamos restaurando; lo que aparezca después es un login nuevo.

### 🔴 El bug de la huella — esta es LA pregunta de tu punto 1

Es la que más probablemente te pregunte, porque es el commit más interesante que tenés.

**Qué pasaba:** al activar el desbloqueo con huella, la app quedaba pidiendo la huella **para siempre**. Cada autenticación exitosa disparaba otra.

**Cómo lo encontré:** puse un `console.log` temporal en el listener de `AppState` y salió esto:

```
[AppState] background | usuario: true
```

**La causa:** Android manda la app a `background` cuando aparece el `BiometricPrompt`. O sea que **el prompt se disparaba a sí mismo**:

```
prompt abierto → Android reporta background → el listener bloquea la sesión
→ aparece la pantalla de desbloqueo → que pide la huella sola
→ la persona la pasa → se desbloquea
→ al cerrarse ese prompt, background otra vez → vuelve a bloquear → loop
```

**El arreglo:** un `useRef` llamado `promptAbierto` que se levanta **antes** de `authenticateAsync` y se baja **un segundo después** de que resuelve.

**Por qué un segundo después y no en el `finally`:** porque el evento de `AppState` llega **después** de que `authenticateAsync` resuelve. Si bajáramos la bandera en el `finally`, el evento la encontraría ya baja y el loop seguiría igual. Esto es lo que demuestra que entendés el orden de los eventos y no copiaste una solución.

### ¿Por qué hay un "Ingresar con mi contraseña" en la pantalla de desbloqueo?

> **Archivo: `screens/auth/DesbloqueoScreen.jsx`**

Es la **salida de emergencia**. Si la huella deja de leerse (dedo lastimado, lector roto), sin eso la persona queda afuera de su propia cuenta para siempre. Cierra la sesión y la manda al login, que es un camino que siempre funciona.

Por lo mismo, `disableDeviceFallback: false`: si la huella no se lee, el sistema ofrece el PIN del dispositivo.

---

## Parte 2 — Punto 5: publicar

### ¿Por qué el wizard es un solo componente y no una pantalla por paso?

> **Archivo: `screens/publicar/PublicarScreen.jsx`** — está en el comentario de arriba.

Porque **los pasos comparten todo el formulario**. Si cada paso fuera una pantalla del navigator, habría que ir pasando el borrador entero de una a otra por `route.params`.

Eso es exactamente el **prop drilling** del que habló el profe en la clase 1. Acá el formulario vive en un solo lugar y los pasos sólo deciden qué parte se muestra.

Hay un beneficio extra: el borrador queda en un solo objeto, listo para guardar.

### ¿Por qué la lista de pasos se calcula en vez de guardarse?

```js
const pasos = [
  { clave: 'tipo', ... },
  { clave: 'fotos', ... },
  ...
  ...(tipo === 'ENCONTRE' ? [{ clave: 'verificacion', ... }] : []),
];
```

Porque el paso de verificación **sólo existe si encontraste algo** (la pregunta la carga quien encontró). Al calcularlo, cambiar el tipo en el paso 1 reordena todo solo y el contador pasa de "de 4" a "de 5" sin que haya que acordarse de actualizarlo.

### ¿Para qué sirve la pregunta de verificación?

Es **el mecanismo anti-chorro del TP**. Quien publica un hallazgo carga una pregunta sobre un detalle que no se ve en las fotos ("¿de qué color es el llavero?") y su respuesta. Quien dice "es mío" tiene que contestarla.

### 🔴 ¿Por qué la respuesta se guarda en texto plano y no hasheada?

Otra pregunta probable, porque suena a error de seguridad y no lo es.

Hashear impediría **las dos cosas que hacen falta**:

1. **Comparar con tolerancia.** Nadie escribe "Azul" igual dos veces. Guardamos la respuesta normalizada (minúsculas, sin acentos, sin espacios de sobra) para que "  Un DADO rojo  " y "un dado rojo" sean la misma respuesta. Con un hash, cualquier diferencia de una letra da "incorrecto".
2. **Que el propio publicador pueda ver qué cargó.**

Que sea **privada** se resuelve de otra forma: **no está en ningún DTO**. Hay un test que busca la respuesta en el JSON entero de la respuesta del endpoint y falla si aparece.

> Si te preguntan "¿y si alguien entra a la base?" — la respuesta honesta es que si alguien tiene acceso a la base ya tiene todo, y la pregunta de verificación es el menor de los problemas. No es una credencial.

### ¿Por qué la dirección exacta no se muestra?

> **Archivo del backend: `src/dtos/halladoDto.js`**

El enunciado lo marca como importante: *"la dirección exacta no se muestra hasta que el reclamo sea aceptado"*.

Está resuelto con un parámetro `verDireccion` cuyo **default es `false`**. Si alguien se olvida de pasarlo, se filtra **de menos**, no de más. Eso se llama *fail-safe*: cuando algo sale mal, sale mal del lado seguro.

Las coordenadas **sí** viajan siempre, porque el listado del punto 3 las muestra y ordena por cercanía con ellas.

### ¿Por qué las fotos se suben apenas se eligen y no al publicar?

> **Archivo: `components/SelectorFotos.jsx`**

Dos razones: la persona ve enseguida si entraron bien, y al tocar "Publicar" no hay que esperar ocho subidas con el formulario entero en juego.

Y se suben **de a una, no con `Promise.all`**: con ocho fotos de 300 KB en paralelo una conexión de celular se tapa y empiezan a dar timeout todas juntas. Además, si una falla, las que ya subieron no se pierden.

### 🔴 ¿Por qué base64 y no multipart?

Es una decisión de diseño que conviene tener clara.

| Opción | Problema |
|---|---|
| base64 guardado **en la base** | Una foto de 2 MB son ~2,7 MB de texto. El listado del punto 3 muestra la portada de cada resultado: una página de 20 resultados pesaría decenas de megas |
| multipart con `multer` | Hay que sumar una dependencia y manejar otro tipo de request |
| **base64 → el backend lo guarda como archivo → devuelve URL** ✅ | Ninguno |

`expo-image-picker` ya devuelve el base64 si se lo pedís, así que el pedido es un JSON normal, y lo que se guarda es un archivo con una URL. El listado pesa lo mismo que una lista de strings.

### ¿Por qué las URLs de las fotos se guardan relativas?

Se guarda `/uploads/xxx.jpg`, no `http://localhost:3000/uploads/xxx.jpg`. Si guardáramos la absoluta quedaría clavado el host con el que se subió (el localhost del túnel, la IP de una red) y la foto no se vería desde ningún otro lado. La app le antepone el origen de su propio backend con `urlDeFoto()`.

### ¿Cómo validás que lo que suben es una imagen?

> **Archivo del backend: `src/services/halladoFotoService.js`**

**El `mime` lo manda el cliente, así que no se le cree.** Se lee la firma de los primeros bytes del archivo. Si dice `image/jpeg` y adentro hay un PNG, se guarda como `.png`: **gana el contenido**.

Nada de SVG, aunque sea una imagen: un SVG es un documento con scripts adentro.

Y el nombre del archivo es **aleatorio**, no el que manda el cliente: si no, dos personas que suben "foto.jpg" se pisan, y un nombre con `../` se escapa de la carpeta.

### 🔴 ¿Por qué el estado VENCIDA no se guarda en la base?

Se **deduce** comparando `vence_en` con `NOW()`:

```sql
IF(p.estado = 'ABIERTA' AND p.vence_en < NOW(), 'VENCIDA', p.estado) AS estado_efectivo
```

Guardarlo obligaría a una **tarea programada** que marque las vencidas todas las noches. Si esa tarea no corre una vez, la app miente.

**Detalle fino:** el filtro de "mis publicaciones" usa el **estado efectivo**, no la columna. Si usara la columna, pedir las VENCIDAS no devolvería ninguna, porque en la columna siguen ABIERTAS.

### ¿Renovar desde cuándo cuenta los 30 días?

**Desde ahora**, no desde el vencimiento viejo. Si contara desde el vencimiento viejo, renovar una que venció hace dos meses la dejaría vencida igual.

### ¿Por qué el borrador es local y no del backend?

> **Archivo: `services/borradorService.js`**

El escenario del enunciado es *"sale de la app y vuelve"*, que es local. Y hay una razón más fuerte: **el punto 6 pide crear una publicación sin conexión**. Un borrador que necesita internet para guardarse no sirve justamente cuando más se lo necesita.

### 🔴 El bug clásico del borrador que evité

El `useEffect` que guarda el borrador **espera a que se haya leído primero** (`borradorListo`).

Sin esa guarda pasa esto: el componente monta con el formulario vacío → el efecto de guardar corre → **pisa el borrador viejo con el vacío** → la persona lo pierde justo al abrir la pantalla.

Es el error más común de este patrón y está comentado en el código.

### ¿Por qué el borrador se pregunta en vez de restaurarse solo?

Pisarle el formulario sin avisar es **peor** que perder el borrador, porque no hay forma de deshacerlo.

### ¿Por qué no se guarda cualquier borrador?

`valeLaPenaGuardar()` pide que haya al menos un título, una descripción, una dirección, una foto, una categoría o un barrio. Un formulario donde sólo se eligió el tipo no es un borrador: es alguien que entró y salió, y ofrecerle retomarlo sería molestar por nada.

### 🔴 El bug de la ubicación

Con la precisión de ubicación prendida, tomar las coordenadas seguía fallando.

**La causa:** `Accuracy.Balanced` le pide la posición al **proveedor de red** (WiFi y antenas). Hay dos situaciones donde ese proveedor no tiene nada que dar: un emulador (sólo tiene GPS simulado) y **un celular real en un lugar sin redes conocidas**.

**El arreglo:** dos intentos. Primero `Balanced` con 8 segundos, que es lo rápido. Si no contesta, se insiste con **GPS** y 20 segundos. Recién después se cae a la última posición conocida.

### ¿Por qué `Balanced` primero y no GPS directo?

GPS enciende el chip, consume batería y puede tardar medio minuto a cielo abierto (más adentro de un edificio). `Balanced` usa WiFi y antenas, contesta en segundos y erra unas decenas de metros — que para "¿en qué esquina lo encontré?" sobra.

---

## Parte 3 — Punto 3: el buscador

### 🔴 ¿Por qué el parámetro se llama `queTePaso` y no `tipo`?

**Esta es la decisión de diseño más defendible que tenés.** Si te preguntan una sola cosa del punto 3, va a ser esta.

El enunciado dice: *"La búsqueda devuelve las publicaciones del tipo opuesto: si perdiste algo, ves lo que otros encontraron"*.

La app manda **lo que le pasó a la persona** y el backend devuelve **lo contrario**:

```js
const OPUESTO = { PERDI: 'ENCONTRE', ENCONTRE: 'PERDI' };
```

**Por qué no llamarlo `tipo`:** si el parámetro fuera `tipo`, alguien lo mandaría al derecho tarde o temprano, y **el error sería invisible**. No explota nada: se ven publicaciones, sólo que las equivocadas. Llamándolo `queTePaso` es imposible confundirse, porque el nombre dice qué significa.

### ¿Por qué el buscador es la pantalla de inicio y no una lista?

Porque el enunciado es explícito: *"al ingresar a la app, la persona no ve un listado sino un buscador guiado"*. Por eso el resto de la app cuelga de un botón "Menú" en el header, en vez de estar en la primera pantalla.

### ¿Por qué un menú y no una barra de pestañas abajo?

Las pestañas necesitan `@react-navigation/bottom-tabs`, **una librería más que el profe no dio**. Para ocho secciones a las que se entra de vez en cuando, una lista alcanza.

> Es un buen ejemplo de criterio: no sumar dependencias que no hacen falta.

### ¿Por qué refinar es un modal y no volver al buscador?

Porque el enunciado dice *"refinar los filtros **sin volver al inicio**"*. Volver al buscador obligaría a rehacer las cuatro preguntas, que es justo lo que se quiere evitar.

### 🔴 ¿Cómo calculás la cercanía y por qué en SQL?

> **Archivo del backend: `src/services/halladoBuscarService.js`, constante `DISTANCIA_KM`**

Con la **fórmula del semiverseno** (*haversine*), que calcula la distancia entre dos puntos sobre una esfera.

**Por qué en SQL y no en Node:** porque hay que **ordenar** por ella. Si trajéramos todo a Node para ordenar ahí, se rompería el paginado — no podés pedir "los primeros 10 más cercanos" si ordenás después de haber cortado.

**Detalle fino:** las que no tienen coordenadas van **al final**:

```sql
ORDER BY p.lat IS NULL, distancia_km ASC, p.fecha_suceso DESC
```

Sin ese `p.lat IS NULL` primero, ordenar por una distancia `NULL` las pondría **primeras**, que es exactamente lo contrario de lo que pide "más cercanos".

### ¿Por qué escapás los comodines de la búsqueda?

```js
const patron = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
```

En SQL, `%` significa "cualquier cosa" dentro de un `LIKE`. Sin escaparlo, alguien que busca **"100%"** recibiría **todas** las publicaciones. Hay un test que lo verifica.

### ¿Por qué el total va en una consulta aparte?

Porque `SQL_CALC_FOUND_ROWS`, que es la forma vieja de hacerlo, está **deprecado desde MySQL 8.0.17**.

### ¿Qué publicaciones se muestran y cuáles no?

Sólo las **ABIERTA** y **EN_RECLAMO** que no vencieron. Una RESUELTA ya encontró a su dueño y una VENCIDA quedó sin renovar: mostrarlas llenaría los resultados de cosas que no llevan a ningún lado.

### ¿Por qué mostrás la distancia y no las coordenadas?

Cuando la persona compartió su ubicación se muestra **"a 150 m"** o **"a 8,2 km"**. Un par de números sueltos no le dice nada a nadie; la distancia sí.

Y se redondea a 50 metros: **"a 847 m" es una precisión que el GPS no tiene**.

### ¿Las "últimas búsquedas" son lo mismo que las alertas del punto 9?

**No**, y el enunciado las pide por separado:

| | Qué son |
|---|---|
| **Últimas búsquedas** (punto 3) | se guardan **solas**, son **locales**, para repetir lo que acabás de buscar |
| **Alertas** (punto 9) | las guarda la persona **a propósito**, viven en el **backend**, avisan cuando aparece algo nuevo |

Por eso las últimas búsquedas van en AsyncStorage: son un historial de **este teléfono**, no un dato de la cuenta.

### ¿Por qué no guardás las coordenadas en el historial?

Repetir una búsqueda de hace una semana con la posición de aquella vez ordenaría por "cercanía" a **un lugar donde la persona ya no está**. Eso es peor que no ordenar por cercanía.

---

## Parte 4 — Dos criterios que se repiten en todas tus pantallas

Si te preguntan "¿cómo manejás los errores?" o "¿qué pasa si se cae internet?", estas son las respuestas.

### Un refresco que falla no borra lo que ya estaba en pantalla

> **Archivos: `MisPublicacionesScreen.jsx` y `ResultadosScreen.jsx`**

```js
} catch (e) {
  setError(e.message);
  // A propósito: no se toca `publicaciones`. Lo que ya estaba sigue ahí.
}
```

**En la entrega anterior (Ronda) pasaba al revés**: al volver de un túnel la pantalla se vaciaba y parecía que se habían borrado las publicaciones.

Es el mismo criterio que va a necesitar el punto 6.

### El spinner grande sale sólo si no hay nada que mostrar

Si ya hay una lista, taparla con un spinner es peor que dejarla un segundo desactualizada.

### Todo sale por un solo cliente de axios

> **Archivo: `services/apiClient.js`**

Un único `axios.create()` con dos interceptores:

- **Request**: le pega el token a todo lo que sale. Lo lee del storage en cada pedido **a propósito**, para que nunca quede desincronizado con lo que realmente está guardado.
- **Response**: traduce el `{ error: { codigo, mensaje } }` del backend a un `ErrorApi` con mensaje mostrable, y distingue el caso de **no haber podido llegar al servidor**.

El profe lo remarcó en la clase 2: *"si no usan el cliente, no se va a activar el interceptor"*.

### La URL del backend está en un solo lugar

> **Archivo: `config/env.js`**

Ningún service escribe una URL a mano. **En la entrega anterior perdimos medio día** porque un merge sin conflictos dejó una IP hardcodeada en el cliente HTTP y la app no se conectaba a nada.

---

## Parte 5 — Si te preguntan algo que no sabés

Tres reglas:

1. **No inventes.** "Eso lo hizo otro compañero" es una respuesta válida y el profe la espera: evalúa por contribuciones.
2. **Si es tuyo pero no te acordás**, el comentario está arriba de la función. Decí en voz alta lo que estás leyendo: "acá dice que..." es mejor que improvisar.
3. **Si dudás entre dos respuestas**, decí las dos y cuál te parece. Mostrar el razonamiento vale más que acertar.

### Las cinco preguntas más probables, en orden

1. **El loop de la huella** — qué pasaba, cómo lo encontraste, por qué el segundo de gracia
2. **`queTePaso` en vez de `tipo`** — por qué el nombre importa
3. **La respuesta de verificación en texto plano** — por qué no está hasheada
4. **El estado VENCIDA deducido** — por qué no se guarda
5. **El borrador: por qué espera a leer antes de guardar** — el bug que evitaste
