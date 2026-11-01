// Punto 1, paso 1 del recupero: a qué email mandamos el código.
//
// "Recibir un código por email para definir una nueva, con la posibilidad de
// reenviarlo en caso de no haberlo recibido o de que haya expirado."
//
// El recupero sigue los mismos tres pasos que el registro, y por la misma
// razón: un OTP se consume al verificarlo, así que antes el código tenía
// que viajar junto con la contraseña nueva y los dos se pedían en la misma
// pantalla. Con el ticket del backend el código se verifica solo, y si está
// mal te enterás antes de tipear nada más.
//
// Ojo con el mensaje de esta pantalla: el backend contesta 200 exista o no
// el email, para que nadie pueda averiguar quién tiene cuenta. Así que no
// podemos afirmar "te lo mandamos" — decimos "si ese email tiene cuenta".
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import Aviso from '../../components/Aviso';
import Boton from '../../components/Boton';
import CampoTexto from '../../components/CampoTexto';
import { recuperarPassword } from '../../services/authService';
import { validarEmail } from '../../utils/validaciones';
import { colors, fontSizes, spacing } from '../../config/theme';

export default function RecuperarPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [errores, setErrores] = useState({});
  const [errorPedido, setErrorPedido] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const pedirCodigo = async () => {
    const error = validarEmail(email);
    setErrores(error ? { email: error } : {});
    setErrorPedido(null);
    if (error) return;

    const emailLimpio = email.trim().toLowerCase();

    setEnviando(true);
    try {
      await recuperarPassword(emailLimpio);
      navigation.navigate('VerificarCodigoRecupero', { email: emailLimpio });
    } catch (e) {
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
        <Text style={styles.paso}>Paso 1 de 3</Text>
        <Text style={styles.titulo}>Recuperar contraseña</Text>
        <Text style={styles.bajada}>
          Decinos tu email y, si tiene una cuenta, te mandamos un código para elegir una
          contraseña nueva.
        </Text>

        <Aviso mensaje={errorPedido} />

        <CampoTexto
          etiqueta="Email"
          placeholder="email@ejemplo.com"
          value={email}
          onChangeText={setEmail}
          error={errores.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          onSubmitEditing={pedirCodigo}
          returnKeyType="done"
        />

        <Boton titulo="Mandarme el código" onPress={pedirCodigo} cargando={enviando} />

        <TouchableOpacity style={styles.volver} onPress={() => navigation.goBack()}>
          <Text style={styles.enlace}>Volver al ingreso</Text>
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
    marginBottom: spacing.lg,
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
