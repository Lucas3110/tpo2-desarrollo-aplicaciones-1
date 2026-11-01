// Punto 1, paso 3 del registro: el nombre y la contraseña.
//
// "...confirmarlo y definir una contraseña."
//
// Se llega acá con el email ya confirmado y un ticket corto que lo prueba
// (ver VerificarCodigoScreen). El código quedó atrás: acá sólo se elige con
// qué nombre te van a ver y con qué contraseña vas a entrar.
//
// Al terminar deja la sesión abierta. La persona acaba de probar que el
// email es suyo y de elegir la contraseña; mandarla al login para que la
// escriba de nuevo dos segundos después es fricción sin ninguna ganancia.
// Pero antes de entrar se confirma que la cuenta quedó creada: sin eso la
// pantalla se cambiaba sola por el buscador y no quedaba claro si había
// salido bien o si te había devuelto al inicio por un error.
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Aviso from '../../components/Aviso';
import Boton from '../../components/Boton';
import CampoTexto from '../../components/CampoTexto';
import { useAuth } from '../../hooks/useAuth';
import { confirmarRegistro } from '../../services/authService';
import {
  LIMITES,
  validarFormulario,
  validarNombre,
  validarPassword,
  validarRepeticionPassword,
} from '../../utils/validaciones';
import { colors, fontSizes, spacing } from '../../config/theme';

// Cuánto se ve el "cuenta creada" antes de entrar a la app. Lo suficiente
// para leerlo, no tanto como para que parezca que se colgó.
const MS_AVISO_CUENTA_CREADA = 1200;

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

export default function CrearCuentaScreen({ navigation, route }) {
  const { email, ticket } = route.params;
  const { iniciarSesion } = useAuth();

  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [repeticion, setRepeticion] = useState('');

  const [errores, setErrores] = useState({});
  const [errorPedido, setErrorPedido] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const crear = async () => {
    const encontrados = validarFormulario({
      nombre: validarNombre(nombre),
      password: validarPassword(password),
      repeticion: validarRepeticionPassword(password, repeticion),
    });
    setErrores(encontrados);
    setErrorPedido(null);
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    try {
      const sesion = await confirmarRegistro({
        email,
        ticket,
        nombre: nombre.trim(),
        password,
      });

      setAviso('¡Listo! Tu cuenta quedó creada. Entrando…');
      await esperar(MS_AVISO_CUENTA_CREADA);

      // Esto deja la sesión guardada y hace que RootNavigator pase solo a la
      // app: no hay que navegar a mano.
      await iniciarSesion(sesion.token, sesion.usuario);
    } catch (e) {
      // El ticket dura quince minutos. Si se vencieron, no sirve de nada
      // reintentar acá: hay que pedir un código nuevo.
      setErrorPedido(e.message);
      setAviso(null);
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <Text style={styles.paso}>Paso 3 de 3</Text>
        <Text style={styles.titulo}>Creá tu cuenta</Text>
        <Text style={styles.bajada}>
          Confirmamos tu email. Ahora elegí con qué nombre te van a ver los vecinos y con qué
          contraseña vas a entrar.
        </Text>

        <View style={styles.emailConfirmado}>
          <Text style={styles.emailTexto} numberOfLines={1}>
            {email}
          </Text>
        </View>

        <Aviso mensaje={errorPedido} />
        <Aviso mensaje={aviso} tipo="exito" />

        <CampoTexto
          etiqueta="Tu nombre"
          placeholder="Como querés que te vean"
          value={nombre}
          onChangeText={setNombre}
          error={errores.nombre}
          maxLength={LIMITES.NOMBRE_MAX}
          autoCapitalize="words"
        />

        <CampoTexto
          etiqueta="Contraseña"
          value={password}
          onChangeText={setPassword}
          error={errores.password}
          ayuda={`Al menos ${LIMITES.PASSWORD_MIN} caracteres`}
          secureTextEntry
          autoCapitalize="none"
        />

        <CampoTexto
          etiqueta="Repetí la contraseña"
          value={repeticion}
          onChangeText={setRepeticion}
          error={errores.repeticion}
          secureTextEntry
          autoCapitalize="none"
          onSubmitEditing={crear}
          returnKeyType="done"
        />

        <Boton titulo="Crear mi cuenta" onPress={crear} cargando={enviando} />

        <TouchableOpacity
          style={styles.volver}
          onPress={() => navigation.goBack()}
          disabled={enviando}
        >
          <Text style={styles.enlace}>Volver</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contenido: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  paso: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  titulo: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  bajada: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  // El email a la vista, para no tener que acordarse de cuál puso.
  emailConfirmado: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  emailTexto: {
    fontSize: fontSizes.sm,
    color: colors.text,
    fontWeight: 'bold',
  },
  enlace: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: 'bold',
  },
  volver: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
});
