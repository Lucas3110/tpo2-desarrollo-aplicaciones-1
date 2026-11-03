# Hallado

App de objetos y mascotas perdidas. TPO 2 de Desarrollo de Aplicaciones I.

React Native + Expo + JavaScript. El backend es el de la entrega anterior
(`tpo-ronda-backend`), reutilizado y ampliado.

**Los 10 puntos del enunciado están implementados.** La app corre entera en
Expo Go, sin compilar nada.

---

## Qué necesitás instalado

| | Versión | Por qué |
|---|---|---|
| Node | **22.13 o mayor** | React Native 0.88 no soporta versiones anteriores |
| Android Studio | la que ya tenías | sólo por el emulador y el SDK |
| Expo Go | del Play Store, en el emulador | es donde corre la app |
| XAMPP | con MySQL | para el backend |

Si tenés Node 22.12 o anterior, actualizalo antes de arrancar. La app igual
bundlea, pero Expo avisa en cada comando que la versión no está soportada.

Chequeá tu versión con `node -v`.

---

## Cómo levantarlo

Son tres cosas, en este orden.

**1. MySQL.** Desde el panel de XAMPP, botón Start.

**2. El backend**, en su propia terminal:

```bash
cd ../tpo-ronda-backend
npm install
npm run db:setup
npm run dev
```

`db:setup` crea la base y todas las tablas. Es idempotente: se puede volver a
correr sin romper nada. Hay que correrlo cada vez que alguien agrega una
migración nueva en `sql/`.

Para una demo o una presentación conviene `npm run demo` en lugar de
`npm run dev`: levanta el backend sin vigilar los archivos. El watcher a veces
se reinicia solo, y si eso cae justo cuando la app manda un pedido, la pantalla
muestra "Sin conexión" con el backend perfectamente arriba.

**3. La app**, en otra terminal:

```bash
npm install
npm run android
```

Antes de la primera corrida, copiá `.env.example` como `.env`:

```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

Y poné el túnel al backend, **cada vez que arranca el emulador**:

```bash
adb reverse tcp:3000 tcp:3000
```

Si algo queda raro después de instalar dependencias:

```bash
npx expo start --clear
```

### Si la app dice "Sin conexión" aunque el backend esté andando

Es lo primero que nos pasó y cuesta de encontrar, porque la app carga bien.

Metro (el que sirve el JavaScript) llega al emulador por un **túnel de adb**
que Expo arma solo para el puerto 8081. El backend no tiene ese túnel, así que
el emulador tiene que alcanzarlo por la red — y el firewall de Windows bloquea
la entrada al 3000. Resultado: la app abre, pero ningún pedido llega.

La solución es el `adb reverse` de arriba, que no necesita permisos de
administrador. **Hay que volver a correrlo cada vez que arranca el emulador**:
el túnel no sobrevive al reinicio.

Si la terminal no te reconoce `adb`, está en
`%LOCALAPPDATA%\Android\Sdk\platform-tools`. Conviene agregar esa carpeta al PATH.

La alternativa es abrir el puerto 3000 en el firewall de Windows (eso sí pide
administrador) y poner `http://10.0.2.2:3000/api` en el `.env`, que es cómo el
emulador ve el `localhost` de la PC. Si vas a probar en un **celular físico**
por WiFi no queda otra: ahí no hay túnel que valga y la URL tiene que ser la IP
de tu máquina en la red (`ipconfig`, la IPv4).

### Si el cartel dice "Tardó demasiado"

Eso no es falta de conexión: el pedido salió y el servidor no contestó a
tiempo. Pasa sobre todo subiendo fotos, que viajan en base64 y pesan cientos de
KB. Reintentar suele alcanzar.

---

## Qué hace la app

| Punto | Qué es | Dónde mirarlo |
|---|---|---|
| 1 | Autenticación y registro | `screens/auth/` |
| 2 | Perfil y reputación | `screens/perfil/` |
| 3 | Buscador guiado y resultados | `screens/buscador/` |
| 4 | Detalle de la publicación | `screens/detalle/` |
| 5 | Publicar un hallazgo o una pérdida | `screens/publicar/` |
| 6 | Modo sin conexión | `services/offlineSyncService.js`, `context/NetworkContext.js` |
| 7 | Reclamos y verificación | `screens/reclamos/` |
| 8 | Devolución y punto de encuentro | `screens/encuentro/` |
| 9 | Alertas y publicaciones seguidas | `screens/alertas/`, `screens/seguidas/` |
| 10 | Historial y valoraciones | `screens/historial/` |

Tres flujos que conviene conocer antes de tocar el código, porque no son una
pantalla sola:

**Registro y recupero van en tres pasos**, cada uno con su pantalla: el email,
el código, y recién después la contraseña. Eso es así porque un OTP se consume
al verificarlo: el backend lo cambia por un *ticket* corto
(`POST /auth/registro/verificar`) y ese ticket es lo que viaja con la
contraseña. Si fueran una sola pantalla, un código mal escrito se avisaría
recién después de llenar todo el formulario.

**La biometría desbloquea una sesión que ya existe**, no reemplaza al login. Se
activa desde Configuración y la preferencia se guarda **por cuenta**, así que
si dos personas usan el mismo teléfono no heredan la decisión de la otra.
`navigation/RootNavigator.jsx` muestra la pantalla de desbloqueo en un `Modal`
encima de la app sin desmontarla: al desbloquear seguís donde estabas.

**El modo sin conexión guarda en AsyncStorage**, en dos claves: las
publicaciones que consultaste y la cola de las que creaste sin internet. Toda
esa lógica vive en `services/offlineSyncService.js`; ninguna pantalla habla con
el almacenamiento directamente.

---

## Expo Go

El proyecto corre entero en **Expo Go**: no hay que compilar nada, ni hace
falta un development build.

Las librerías que usamos vienen adentro de Expo Go (`expo-secure-store`,
`expo-local-authentication`, `expo-image-picker`, `expo-location`) o son
JavaScript puro (`@react-native-async-storage/async-storage`,
`@react-native-community/netinfo`).

Eso es una restricción deliberada, no una casualidad. Si alguna vez una
funcionalidad parece pedir una librería nativa, conviene buscar primero cómo
resolverla con lo que ya está: el modo sin conexión arrancó usando una base de
datos nativa y terminó en AsyncStorage, que alcanzaba de sobra y no sacaba al
proyecto de Expo Go.

---

## Estructura

La que propuso el profe en clase:

```
components/   piezas de UI reutilizables, sin lógica de negocio
screens/      una pantalla = un caso de uso
navigation/   definición de las navegaciones
services/     comunicación con el backend (axios). JS puro, sin JSX
hooks/        custom hooks
context/      estado global (useContext)
config/       constantes: URL del backend, colores, medidas
utils/        helpers y validaciones. JS puro
```

Convenciones:

- **`.jsx`** para los archivos que devuelven componentes, **`.js`** para JavaScript puro.
- **JavaScript, no TypeScript.** El profe lo pidió explícitamente.
- **`useContext` para el estado global, no Redux.** Para manejar la sesión alcanza.

Los tres contextos, y por qué están anidados en ese orden en `App.js`:

```
AuthProvider            la sesión
  NetworkProvider       el estado de la red y la cola offline
    BiometriaProvider   necesita saber si hay sesión para decidir si bloquea
```

### Tres reglas que no conviene romper

**1. La URL del backend vive en un solo lugar: `config/env.js`.**
Ningún service escribe una URL a mano. En la entrega anterior perdimos medio día
porque un merge dejó una IP hardcodeada en el cliente HTTP y la app no se
conectaba a nada — y el merge no había dado ni un conflicto.

**2. Todos los pedidos salen por `services/apiClient.js`.**
Ese cliente tiene los interceptores que le pegan el token a cada request, que
traducen los errores del backend y que cierran la sesión sola cuando el token
deja de valer. Si alguien crea otro cliente con `axios.create()`, los
interceptores no corren y los pedidos salen sin token.

**3. Si abrís un diálogo del sistema, avisá.**
La galería, el pedido de permisos y el prompt de huella mandan la app a segundo
plano, y la biometría escucha ese evento para bloquear la sesión. Sin avisar,
elegir una foto te pide la huella en la mitad de la carga. Eso ya está resuelto
en los services que abren esos diálogos (`services/dialogosDelSistema.js`), así
que **no hay que hacer nada en las pantallas** — pero si agregás un service
nuevo que abra uno, envolvelo igual.

---

## Cómo trabajamos

Una rama por feature, PR, y recién ahí a `main`. PRs chicos: es más fácil
revisar cuatro de cien líneas que uno de cuatrocientas, y el profe evalúa las
contribuciones de cada uno en GitHub.

```
feature/punto1-registro-otp
feature/punto3-buscador-guiado
feature/punto5-publicar-fotos
```

El `.env` no se commitea: cada uno tiene su propia URL. Está `.env.example`
como plantilla.
