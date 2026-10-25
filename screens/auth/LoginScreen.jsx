// Punto 1: ingreso con email y contraseña.
//
// Sobre el mensaje de error: el backend contesta lo mismo ("Email o
// contraseña incorrectos") cuando el email no existe y cuando la contraseña
// está mal, para que nadie pueda averiguar qué emails tienen cuenta probando
// de a uno. Así que mostramos el mensaje tal cual viene y no marcamos un
// campo en particular.
//
// La excepción es EMAIL_NO_VERIFICADO: ahí la cuenta existe pero nunca se
// confirmó el email, y dejarla con un "incorrectos" sería mentirle. En ese
// caso le ofrecemos volver al registro para pedir un código nuevo.
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
import { login } from '../../services/authService';
import { validarEmail, validarFormulario } from '../../utils/validaciones';
import { colors, fontSizes, spacing } from '../../config/theme';

export default function LoginScreen({ navigation }) {
  const { iniciarSesion } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState({});
  const [errorPedido, setErrorPedido] = useState(null);
  const [sinVerificar, setSinVerificar] = useState(false);
  const [entrando, setEntrando] = useState(false);

  const ingresar = async () => {
    // De la contraseña solo chequeamos que no esté vacía: acá no corresponde
    // decirle que es corta. Si la cuenta se creó cuando el mínimo era otro,
    // la contraseña sigue siendo la correcta.
    const encontrados = validarFormulario({
      email: validarEmail(email),
      password: password === '' ? 'Escribí tu contraseña' : null,
    });
    setErrores(encontrados);
    setErrorPedido(null);
    setSinVerificar(false);
    if (Object.keys(encontrados).length > 0) return;

    const emailLimpio = email.trim().toLowerCase();

    setEntrando(true);
    try {
      const sesion = await login({ email: emailLimpio, password });
      // Guarda la sesión y RootNavigator pasa solo a la app.
      await iniciarSesion(sesion.token, sesion.usuario);
    } catch (e) {
      setErrorPedido(e.message);
      setSinVerificar(e.codigo === 'EMAIL_NO_VERIFICADO');
    } finally {
      setEntrando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>Hallado</Text>
        <Text style={styles.bajada}>Objetos y mascotas perdidas</Text>

        <Aviso mensaje={errorPedido} />

        {sinVerificar ? (
          <TouchableOpacity
            style={styles.accionAviso}
            onPress={() => navigation.navigate('Registro')}
          >
            <Text style={styles.enlace}>Pedir un código nuevo</Text>
          </TouchableOpacity>
        ) : null}

        <CampoTexto
          etiqueta="Email"
          placeholder="vos@ejemplo.com"
          value={email}
          onChangeText={setEmail}
          error={errores.email}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
        />

        <CampoTexto
          etiqueta="Contraseña"
          value={password}
          onChangeText={setPassword}
          error={errores.password}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          onSubmitEditing={ingresar}
          returnKeyType="done"
        />

        <Boton titulo="Ingresar" onPress={ingresar} cargando={entrando} />

        <TouchableOpacity
          style={styles.olvide}
          onPress={() => navigation.navigate('RecuperarPassword')}
        >
          <Text style={styles.enlace}>Olvidé mi contraseña</Text>
        </TouchableOpacity>

        <View style={styles.pie}>
          <Text style={styles.textoPie}>¿No tenés cuenta?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Registro')}>
            <Text style={styles.enlace}>Creá una</Text>
          </TouchableOpacity>
        </View>
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
  titulo: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  bajada: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  accionAviso: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  olvide: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  pie: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  textoPie: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  enlace: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: 'bold',
  },
});
