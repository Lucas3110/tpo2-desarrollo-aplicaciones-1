# Hallado

App de objetos y mascotas perdidas. TPO 2 de Desarrollo de Aplicaciones I.

React Native + Expo + JavaScript. El backend es el de la entrega anterior
(`tpo-ronda-backend`), que se reutiliza y se va ampliando.

---

## Qué necesitás instalado

| | Versión | Por qué |
|---|---|---|
| Node | **22.13 o mayor** | React Native 0.88 no soporta versiones anteriores |
| Android Studio | la que ya tenías | solo por el emulador y el SDK |
| Expo Go | del Play Store, en el emulador | es donde corre la app |

Si tenés Node 22.12 o anterior, actualizalo antes de arrancar. La app igual
bundlea, pero Expo avisa en cada comando que la versión no está soportada.

Chequeá tu versión con `node -v`.

---

## Cómo levantarlo

```bash
npm install
```

Copiá `.env.example` como `.env` y dejá la URL de tu backend:

```
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api
```

`10.0.2.2` es cómo el emulador de Android ve el `localhost` de tu PC. Si querés
probar en tu celular físico, poné la IP de tu máquina en la red WiFi (`ipconfig`,
la IPv4) y asegurate de que la PC y el celular estén en la misma red.

Después:

```bash
npm run android
```

Eso abre Metro y lanza la app en el emulador. La primera vez, si el emulador no
tiene Expo Go, se lo instala desde el Play Store solo. Guardás un archivo y la
pantalla se actualiza sin reiniciar nada.

Si algo queda raro después de instalar dependencias:

```bash
npx expo start --clear
```

---

## Expo Go y el development build

Hoy el proyecto corre entero en **Expo Go**: no hay que compilar nada. Todas las
librerías que usamos vienen adentro de Expo Go (`expo-secure-store`,
`expo-local-authentication`, `expo-image-picker`, `expo-location`).

Eso **cambia cuando entre WatermelonDB** (lo necesita el punto 6). WatermelonDB
no está en el SDK de Expo, así que no funciona en Expo Go y hay que pasar a
**development build**:

```bash
npx expo run:android
```

La primera vez tarda 10-15 minutos porque compila la app nativa. Después se
trabaja igual que antes.

**Importante:** cuando eso pase, lo tiene que hacer todo el equipo, no solo quien
agregó la librería. No es una decisión individual.

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

### Dos reglas que no conviene romper

**1. La URL del backend vive en un solo lugar: `config/env.js`.**
Ningún service escribe una URL a mano. En la entrega anterior perdimos medio día
porque un merge dejó una IP hardcodeada en el cliente HTTP y la app no se
conectaba a nada — y el merge no había dado ni un conflicto.

**2. Todos los pedidos salen por `services/apiClient.js`.**
Ese cliente tiene los interceptores que le pegan el token a cada request y que
traducen los errores del backend. Si alguien crea otro cliente con
`axios.create()`, los interceptores no corren y los pedidos salen sin token.

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

### Pantallas pendientes

`MainNavigator` ya tiene registradas **todas** las pantallas de los 10 puntos.
Las que nadie implementó todavía apuntan a `pantallaPendiente()`, que muestra un
cartel con el número de punto.

Eso es a propósito: si tu punto necesita navegar a una pantalla de otro, podés
hacerlo hoy con `navigation.navigate('DetallePublicacion')` sin esperar a nadie.
Cuando el otro mergee, se cambia el `component` en `MainNavigator` y nada más.

### Estado

| Punto | Qué es | Estado |
|---|---|---|
| 1 | Autenticación y registro | pendiente |
| 2 | Perfil y reputación | pendiente |
| 3 | Buscador y resultados | pendiente |
| 4 | Detalle de la publicación | pendiente |
| 5 | Publicar | pendiente |
| 6 | Modo sin conexión | pendiente |
| 7 | Reclamos y verificación | pendiente |
| 8 | Devolución y punto de encuentro | pendiente |
| 9 | Alertas y seguidas | pendiente |
| 10 | Historial y valoraciones | pendiente |

El login de `screens/auth/LoginScreen.jsx` entra con un usuario de mentira a
propósito, para que el resto pueda ver las pantallas de adentro mientras el
punto 1 se construye. Lo reemplaza el punto 1.
