// Punto 1, paso 3 del recupero: elegir la contraseña nueva.
//
// Se llega acá con el código ya confirmado y un ticket corto que lo prueba.
// Si se vence (quince minutos), no sirve reintentar: hay que pedir otro
// código, y el error del backend lo dice así.
//
// Al terminar deja la sesión abierta, igual que el registro: la persona
// acaba de probar que el email es suyo y de elegir la contraseña, mandarla
// al login para escribirla de nuevo sería fricción sin ganancia.
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
import { restablecerPassword } from '../../services/authService';
import {
  LIMITES,
  validarFormulario,
  validarPassword,
  validarRepeticionPassword,
} from '../../utils/validaciones';
import { colors, fontSizes, spacing } from '../../config/theme';

// Lo suficiente para leer la confirmación, no tanto como para que parezca
// que se colgó.
const MS_AVISO_LISTO = 1200;

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

export default function NuevaPasswordScreen({ navigation, route }) {
  const { email, ticket } = route.params;
  const { iniciarSesion } = useAuth();

  const [password, setPassword] = useState('');
  const [repeticion, setRepeticion] = useState('');

  const [errores, setErrores] = useState({});
  const [errorPedido, setErrorPedido] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const restablecer = async () => {
    const encontrados = validarFormulario({
      password: validarPassword(password),
      repeticion: validarRepeticionPassword(password, repeticion),
    });
    setErrores(encontrados);
    setErrorPedido(null);
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    try {
      const sesion = await restablecerPassword({ email, ticket, password });

      setAviso('¡Listo! Ya podés entrar con tu contraseña nueva.');
      await esperar(MS_AVISO_LISTO);

      await iniciarSesion(sesion.token, sesion.usuario);
    } catch (e) {
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
        <Text style={styles.titulo}>Elegí tu contraseña nueva</Text>
        <Text style={styles.bajada}>
          Confirmamos que el email es tuyo. Elegí con qué contraseña vas a entrar de ahora en
          adelante.
        </Text>

        <View style={styles.emailConfirmado}>
          <Text style={styles.emailTexto} numberOfLines={1}>
            {email}
          </Text>
        </View>

        <Aviso mensaje={errorPedido} />
        <Aviso mensaje={aviso} tipo="exito" />

        <CampoTexto
          etiqueta="Contraseña nueva"
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
          onSubmitEditing={restablecer}
          returnKeyType="done"
        />

        <Boton titulo="Guardar y entrar" onPress={restablecer} cargando={enviando} />

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
