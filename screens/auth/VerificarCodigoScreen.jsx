// Punto 1, paso 2 del registro: confirmar el código y definir la contraseña.
//
// El código, el nombre y la contraseña van en la misma pantalla a propósito.
// El enunciado los agrupa ("confirmarlo y definir una contraseña") y hay una
// razón práctica: el backend consume el código y guarda los datos en el mismo
// pedido, así que si estuvieran en pantallas separadas la persona tipearía
// nombre y contraseña para enterarse después de que el código estaba mal.
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
import { confirmarRegistro, solicitarRegistro } from '../../services/authService';
import {
  LIMITES,
  validarCodigo,
  validarFormulario,
  validarNombre,
  validarPassword,
  validarRepeticionPassword,
} from '../../utils/validaciones';
import { colors, fontSizes, spacing } from '../../config/theme';

export default function VerificarCodigoScreen({ navigation, route }) {
  const { email } = route.params;
  const { iniciarSesion } = useAuth();

  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [repeticion, setRepeticion] = useState('');

  const [errores, setErrores] = useState({});
  const [errorPedido, setErrorPedido] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  const confirmar = async () => {
    const encontrados = validarFormulario({
      codigo: validarCodigo(codigo),
      nombre: validarNombre(nombre),
      password: validarPassword(password),
      repeticion: validarRepeticionPassword(password, repeticion),
    });
    setErrores(encontrados);
    setErrorPedido(null);
    setAviso(null);
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    try {
      const sesion = await confirmarRegistro({
        email,
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        password,
      });
      // Esto deja la sesión guardada y hace que RootNavigator pase solo a la
      // app: no hay que navegar a mano.
      await iniciarSesion(sesion.token, sesion.usuario);
    } catch (e) {
      setErrorPedido(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const reenviar = async () => {
    setErrorPedido(null);
    setAviso(null);
    setReenviando(true);
    try {
      await solicitarRegistro(email);
      setAviso('Te mandamos un código nuevo.');
      setCodigo('');
    } catch (e) {
      // El caso típico acá es el cooldown del backend ("esperá N segundos").
      setErrorPedido(e.message);
    } finally {
      setReenviando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>Confirmá tu email</Text>
        <Text style={styles.bajada}>
          Te mandamos un código de {LIMITES.LARGO_CODIGO} números al email que pusiste.
        </Text>

        <Aviso mensaje={errorPedido} />
        <Aviso mensaje={aviso} tipo="exito" />

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
          <TouchableOpacity onPress={reenviar} disabled={reenviando}>
            <Text style={[styles.enlace, reenviando ? styles.enlaceInactivo : null]}>
              {reenviando ? 'Enviando…' : 'Reenviar'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.separador} />

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
          onSubmitEditing={confirmar}
          returnKeyType="done"
        />

        <Boton titulo="Crear mi cuenta" onPress={confirmar} cargando={enviando} />

        <TouchableOpacity style={styles.volver} onPress={() => navigation.goBack()}>
          <Text style={styles.enlace}>Usar otro email</Text>
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
