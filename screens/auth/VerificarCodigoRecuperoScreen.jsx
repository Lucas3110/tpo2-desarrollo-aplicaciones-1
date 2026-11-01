// Punto 1, paso 2 del recupero: confirmar el código, y nada más.
//
// "...con la posibilidad de reenviarlo en caso de no haberlo recibido o de
// que haya expirado." De ahí el "Reenviar" de abajo.
//
// Gemela de VerificarCodigoScreen, la del registro: lo único que cambia es
// a qué endpoint le pregunta. Son dos archivos y no uno parametrizado
// porque los textos, el paso siguiente y la salida son distintos, y
// unificarlos terminaría en una pantalla llena de condicionales por un
// ahorro de veinte líneas.
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
import { recuperarPassword, verificarCodigoDeRecupero } from '../../services/authService';
import { LIMITES, validarCodigo, validarFormulario } from '../../utils/validaciones';
import { colors, fontSizes, spacing } from '../../config/theme';

export default function VerificarCodigoRecuperoScreen({ navigation, route }) {
  const { email } = route.params;

  const [codigo, setCodigo] = useState('');
  const [errores, setErrores] = useState({});
  const [errorPedido, setErrorPedido] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  const verificar = async () => {
    const encontrados = validarFormulario({ codigo: validarCodigo(codigo) });
    setErrores(encontrados);
    setErrorPedido(null);
    setAviso(null);
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    try {
      const { ticket } = await verificarCodigoDeRecupero({ email, codigo: codigo.trim() });
      navigation.navigate('NuevaPassword', { email, ticket });
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
      await recuperarPassword(email);
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
        <Text style={styles.paso}>Paso 2 de 3</Text>
        <Text style={styles.titulo}>Revisá tu email</Text>
        <Text style={styles.bajada}>
          Escribí el código de {LIMITES.LARGO_CODIGO} números que te llegó al email de tu cuenta.
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
          onSubmitEditing={verificar}
          returnKeyType="done"
        />

        <View style={styles.reenvio}>
          <Text style={styles.textoPie}>¿No te llegó?</Text>
          <TouchableOpacity onPress={reenviar} disabled={reenviando}>
            <Text style={[styles.enlace, reenviando ? styles.enlaceInactivo : null]}>
              {reenviando ? 'Enviando…' : 'Reenviar'}
            </Text>
          </TouchableOpacity>
        </View>

        <Boton titulo="Continuar" onPress={verificar} cargando={enviando} />

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
  reenvio: {
    flexDirection: 'row',
    gap: spacing.xs,
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
