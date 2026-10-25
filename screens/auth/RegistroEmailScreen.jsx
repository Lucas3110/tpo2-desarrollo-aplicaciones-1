// Punto 1, paso 1 del registro: pedir el email.
//
// El enunciado pide este orden: "solicitar email -> recibir un código de
// validación (OTP) -> confirmarlo y definir una contraseña". O sea que acá
// todavía no se pide la contraseña.
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
import { solicitarRegistro } from '../../services/authService';
import { validarEmail } from '../../utils/validaciones';
import { colors, fontSizes, spacing } from '../../config/theme';

export default function RegistroEmailScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [errorCampo, setErrorCampo] = useState(null);
  const [errorPedido, setErrorPedido] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const continuar = async () => {
    // Validamos acá antes de molestar al backend. Él valida igual.
    const error = validarEmail(email);
    setErrorCampo(error);
    setErrorPedido(null);
    if (error) return;

    const emailLimpio = email.trim().toLowerCase();

    setEnviando(true);
    try {
      const respuesta = await solicitarRegistro(emailLimpio);
      navigation.navigate('VerificarCodigo', {
        email: emailLimpio,
        codigoDesarrollo: respuesta.codigoDesarrollo,
      });
    } catch (e) {
      // e es un ErrorApi: ya viene con el mensaje del backend o con el de
      // "sin conexión" si no se pudo llegar al servidor.
      setErrorPedido(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>Crear cuenta</Text>
        <Text style={styles.bajada}>
          Te vamos a mandar un código para confirmar que el email es tuyo.
        </Text>

        <Aviso mensaje={errorPedido} />

        <CampoTexto
          etiqueta="Email"
          placeholder="vos@ejemplo.com"
          value={email}
          onChangeText={setEmail}
          error={errorCampo}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          onSubmitEditing={continuar}
          returnKeyType="next"
        />

        <Boton titulo="Continuar" onPress={continuar} cargando={enviando} />

        <View style={styles.pie}>
          <Text style={styles.textoPie}>¿Ya tenés cuenta?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.enlace}>Ingresá</Text>
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
    marginBottom: spacing.xs,
  },
  bajada: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
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
