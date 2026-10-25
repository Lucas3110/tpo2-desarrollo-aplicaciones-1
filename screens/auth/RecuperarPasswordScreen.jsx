// Punto 1: recupero de contraseña.
//
// "Recibir un código por email para definir una nueva, con la posibilidad de
// reenviarlo en caso de no haberlo recibido o de que haya expirado."
//
// Son dos pasos y los hacemos en una sola pantalla con un estado `paso`, en
// vez de dos pantallas del navigator. La razón: el email tiene que seguir
// siendo el mismo entre el pedido del código y el restablecimiento, y
// teniéndolo en un solo componente no hay forma de que se desincronice.
//
// Ojo con el mensaje del paso 1: el backend contesta 200 exista o no el
// email, para que nadie pueda averiguar quién tiene cuenta. Así que no
// podemos afirmar "te lo mandamos" — decimos "si ese email tiene cuenta".
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
import { recuperarPassword, restablecerPassword } from '../../services/authService';
import {
  LIMITES,
  validarCodigo,
  validarEmail,
  validarFormulario,
  validarPassword,
  validarRepeticionPassword,
} from '../../utils/validaciones';
import { colors, fontSizes, spacing } from '../../config/theme';

export default function RecuperarPasswordScreen({ navigation }) {
  const { iniciarSesion } = useAuth();

  const [paso, setPaso] = useState('email'); // 'email' | 'codigo'
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [repeticion, setRepeticion] = useState('');

  const [errores, setErrores] = useState({});
  const [errorPedido, setErrorPedido] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [codigoDesarrollo, setCodigoDesarrollo] = useState(null);
  const [trabajando, setTrabajando] = useState(false);

  const pedirCodigo = async ({ esReenvio = false } = {}) => {
    const error = validarEmail(email);
    setErrores(error ? { email: error } : {});
    setErrorPedido(null);
    setAviso(null);
    if (error) return;

    const emailLimpio = email.trim().toLowerCase();

    setTrabajando(true);
    try {
      const respuesta = await recuperarPassword(emailLimpio);
      setCodigoDesarrollo(respuesta.codigoDesarrollo ?? null);
      setAviso(
        esReenvio
          ? 'Te mandamos un código nuevo.'
          : 'Si ese email tiene cuenta, te va a llegar un código.'
      );
      if (esReenvio) setCodigo('');
      setPaso('codigo');
    } catch (e) {
      setErrorPedido(e.message);
    } finally {
      setTrabajando(false);
    }
  };

  const restablecer = async () => {
    const encontrados = validarFormulario({
      codigo: validarCodigo(codigo),
      password: validarPassword(password),
      repeticion: validarRepeticionPassword(password, repeticion),
    });
    setErrores(encontrados);
    setErrorPedido(null);
    setAviso(null);
    if (Object.keys(encontrados).length > 0) return;

    setTrabajando(true);
    try {
      const sesion = await restablecerPassword({
        email: email.trim().toLowerCase(),
        codigo: codigo.trim(),
        password,
      });
      // Deja la sesión abierta: RootNavigator pasa solo a la app.
      await iniciarSesion(sesion.token, sesion.usuario);
    } catch (e) {
      setErrorPedido(e.message);
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>Recuperar contraseña</Text>
        <Text style={styles.bajada}>
          {paso === 'email'
            ? 'Te mandamos un código al email de tu cuenta.'
            : `Escribí el código que te llegó a ${email.trim().toLowerCase()} y elegí una contraseña nueva.`}
        </Text>

        {/* En desarrollo el backend devuelve el código en la respuesta para no
            tener que abrir el mail. En producción no viene y esto no se ve. */}
        {__DEV__ && codigoDesarrollo ? (
          <Aviso mensaje={`Código (solo en desarrollo): ${codigoDesarrollo}`} tipo="info" />
        ) : null}

        <Aviso mensaje={errorPedido} />
        <Aviso mensaje={aviso} tipo="exito" />

        {paso === 'email' ? (
          <>
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
              onSubmitEditing={() => pedirCodigo()}
              returnKeyType="done"
            />

            <Boton titulo="Enviarme el código" onPress={() => pedirCodigo()} cargando={trabajando} />
          </>
        ) : (
          <>
            <CampoTexto
              etiqueta="Código"
              placeholder="123456"
              value={codigo}
              onChangeText={setCodigo}
              error={errores.codigo}
              keyboardType="number-pad"
              maxLength={LIMITES.LARGO_CODIGO}
              autoComplete="one-time-code"
            />

            <View style={styles.reenvio}>
              <Text style={styles.textoPie}>¿No te llegó?</Text>
              <TouchableOpacity onPress={() => pedirCodigo({ esReenvio: true })} disabled={trabajando}>
                <Text style={[styles.enlace, trabajando ? styles.enlaceInactivo : null]}>
                  Reenviar
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.separador} />

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
              etiqueta="Repetila"
              value={repeticion}
              onChangeText={setRepeticion}
              error={errores.repeticion}
              secureTextEntry
              autoCapitalize="none"
              onSubmitEditing={restablecer}
              returnKeyType="done"
            />

            <Boton titulo="Guardar y entrar" onPress={restablecer} cargando={trabajando} />

            <TouchableOpacity
              style={styles.volver}
              onPress={() => {
                // Volver al paso del email sin arrastrar el estado del otro.
                setPaso('email');
                setCodigo('');
                setPassword('');
                setRepeticion('');
                setErrores({});
                setErrorPedido(null);
                setAviso(null);
                setCodigoDesarrollo(null);
              }}
            >
              <Text style={styles.enlace}>Usar otro email</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.volver} onPress={() => navigation.navigate('Login')}>
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
  reenvio: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  separador: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
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
  enlaceInactivo: {
    opacity: 0.5,
  },
  volver: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
});
