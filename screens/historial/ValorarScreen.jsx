// Punto 10: valorar a la otra parte de un caso resuelto.
//
// "Dentro de los 7 días posteriores a la devolución, cada parte puede
// valorar a la otra (positiva o negativa) y dejar un mensaje breve
// opcional. Quien recuperó su objeto puede además dejar un agradecimiento
// público, visible en el perfil de quien se lo devolvió."
//
// El mensaje y el agradecimiento son dos cosas distintas y por eso son dos
// campos: el mensaje queda entre las dos personas, el agradecimiento lo ve
// cualquiera que mire el perfil. Si fueran uno solo, alguien escribiría
// algo privado creyendo que no se publica.
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
import SelectorOpciones from '../../components/SelectorOpciones';
import { valorarCaso } from '../../services/historialService';
import { colors, fontSizes, radius, spacing } from '../../config/theme';

const TIPOS = [
  { valor: 'POSITIVA', etiqueta: 'Positiva', ayuda: 'Salió todo bien' },
  { valor: 'NEGATIVA', etiqueta: 'Negativa', ayuda: 'Algo no estuvo bien' },
];

const MENSAJE_MAX = 300;
const AGRADECIMIENTO_MAX = 500;

export default function ValorarScreen({ navigation, route }) {
  // Viene del historial: el caso, con quién fue y si recuperé (sólo quien
  // recuperó puede agradecer).
  const { casoId, contraparte, titulo, puedoAgradecer } = route.params;

  const [tipo, setTipo] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [agradecimiento, setAgradecimiento] = useState('');
  const [errores, setErrores] = useState({});
  const [errorPedido, setErrorPedido] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(null);

  async function enviar() {
    const malos = {};
    if (tipo === null) malos.tipo = 'Elegí una de las dos';
    if (mensaje.length > MENSAJE_MAX) malos.mensaje = `Hasta ${MENSAJE_MAX} caracteres`;
    if (agradecimiento.length > AGRADECIMIENTO_MAX) {
      malos.agradecimiento = `Hasta ${AGRADECIMIENTO_MAX} caracteres`;
    }
    setErrores(malos);
    setErrorPedido(null);
    if (Object.keys(malos).length > 0) return;

    setEnviando(true);
    try {
      const valoracion = await valorarCaso(casoId, {
        tipo,
        mensaje: mensaje.trim() || null,
        ...(puedoAgradecer && agradecimiento.trim() ? { agradecimiento: agradecimiento.trim() } : {}),
      });
      setEnviada(valoracion);
    } catch (e) {
      // YA_VALORASTE, PLAZO_VENCIDO: el backend lo explica en el mensaje.
      setErrorPedido(e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (enviada) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.exitoTitulo}>¡Gracias!</Text>
        <Text style={styles.exitoTexto}>
          Tu valoración {enviada.tipo === 'POSITIVA' ? 'positiva' : 'negativa'} ya cuenta en la
          reputación de {contraparte.nombre}.
        </Text>
        {enviada.agradecimiento ? (
          <Text style={styles.exitoDetalle}>Tu agradecimiento se ve en su perfil público.</Text>
        ) : null}
        <View style={styles.exitoBotones}>
          <Boton titulo="Volver al historial" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>Valorar a {contraparte.nombre}</Text>
        <Text style={styles.subtitulo}>{titulo}</Text>

        <Aviso mensaje={errorPedido} />

        <SelectorOpciones
          etiqueta="¿Cómo fue?"
          opciones={TIPOS}
          valor={tipo}
          onElegir={(v) => {
            setTipo(v);
            setErrores((previos) => ({ ...previos, tipo: undefined }));
          }}
          error={errores.tipo}
          columnas
        />

        <CampoTexto
          etiqueta="Mensaje (opcional)"
          placeholder="Vino puntual y fue muy amable"
          value={mensaje}
          onChangeText={setMensaje}
          error={errores.mensaje}
          maxLength={MENSAJE_MAX}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={styles.areaTexto}
          ayuda={`Lo lee ${contraparte.nombre} y nadie más.`}
        />

        {puedoAgradecer ? (
          <View style={styles.agradecimiento}>
            <CampoTexto
              etiqueta="Agradecimiento público (opcional)"
              placeholder={`Gracias ${contraparte.nombre} por guardármelo...`}
              value={agradecimiento}
              onChangeText={setAgradecimiento}
              error={errores.agradecimiento}
              maxLength={AGRADECIMIENTO_MAX}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={styles.areaTexto}
              ayuda={`Se muestra en el perfil público de ${contraparte.nombre}, para que otros vean que devuelve lo que encuentra.`}
            />
          </View>
        ) : null}

        <View style={styles.botones}>
          <Boton titulo="Enviar valoración" onPress={enviar} cargando={enviando} />
          <TouchableOpacity style={styles.volver} onPress={() => navigation.goBack()} disabled={enviando}>
            <Text style={styles.enlace}>Cancelar</Text>
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
    padding: spacing.lg,
    flexGrow: 1,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  titulo: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitulo: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  areaTexto: {
    minHeight: 80,
  },
  agradecimiento: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    paddingBottom: 0,
  },
  botones: {
    marginTop: spacing.lg,
  },
  volver: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  enlace: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: 'bold',
  },
  exitoTitulo: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: spacing.sm,
  },
  exitoTexto: {
    fontSize: fontSizes.md,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  exitoDetalle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  exitoBotones: {
    marginTop: spacing.xl,
    width: '100%',
  },
});
