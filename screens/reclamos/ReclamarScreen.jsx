// Punto 7: hacer un reclamo sobre una publicación ajena.
//
// Son dos formularios distintos según qué publicó la otra persona:
//
//   "Es mío"       sobre algo ENCONTRADO: hay que responder la pregunta de
//                  verificación, y se puede agregar una descripción y una
//                  foto que acredite que el objeto es de uno.
//   "Lo encontré"  sobre algo PERDIDO: hay que adjuntar una foto y el barrio
//                  donde se lo encontró, para que el dueño confirme.
//
// Cuál de los dos toca viene en route.params.tipo, que lo decidió el
// backend en el detalle. La respuesta la compara el backend: la app nunca
// ve la respuesta correcta.
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import SelectorLista from '../../components/SelectorLista';
import { elegirDeGaleria, subirFoto } from '../../services/fotoService';
import { obtenerBarrios, urlDeFoto } from '../../services/publicacionService';
import { crearReclamo } from '../../services/reclamoService';
import { colors, fontSizes, radius, spacing } from '../../config/theme';

const DESCRIPCION_MAX = 1000;
const RESPUESTA_MAX = 255;

// Con estos códigos no tiene sentido seguir en el formulario: el problema
// no es lo que se escribió, es que ya no se puede reclamar.
const CODIGOS_SIN_SALIDA = ['SIN_INTENTOS', 'RECLAMO_PENDIENTE', 'PUBLICACION_NO_RECLAMABLE', 'ES_TU_PUBLICACION'];

export default function ReclamarScreen({ navigation, route }) {
  const { publicacionId, tipo, titulo, pregunta } = route.params;
  const esMio = tipo === 'ES_MIO';

  const [respuesta, setRespuesta] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fotoUrl, setFotoUrl] = useState(null);
  const [barrioId, setBarrioId] = useState(null);

  const [barrios, setBarrios] = useState([]);
  const [cargandoBarrios, setCargandoBarrios] = useState(!esMio);

  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState({});
  const [errorPedido, setErrorPedido] = useState(null);
  const [sinSalida, setSinSalida] = useState(false);
  const [enviado, setEnviado] = useState(null);

  // El barrio sólo hace falta en "Lo encontré".
  useEffect(() => {
    if (esMio) return;
    obtenerBarrios()
      .then(setBarrios)
      .catch((e) => setErrorPedido(e.message))
      .finally(() => setCargandoBarrios(false));
  }, [esMio]);

  // Una sola foto: es la que acredita. Se sube apenas se elige, como en
  // publicar, así al enviar no hay que esperar nada.
  async function agregarFoto() {
    setErrorPedido(null);
    try {
      const [elegida] = await elegirDeGaleria(1);
      if (!elegida) return;
      setSubiendoFoto(true);
      setFotoUrl(await subirFoto(elegida));
      setErrores((previos) => ({ ...previos, foto: undefined }));
    } catch (e) {
      setErrorPedido(e.message);
    } finally {
      setSubiendoFoto(false);
    }
  }

  function validar() {
    const malos = {};
    if (esMio) {
      if (respuesta.trim() === '') malos.respuesta = 'Escribí tu respuesta';
      else if (respuesta.trim().length > RESPUESTA_MAX) malos.respuesta = `Hasta ${RESPUESTA_MAX} caracteres`;
    } else {
      if (!fotoUrl) malos.foto = 'Agregá una foto de lo que encontraste';
      if (barrioId === null) malos.barrio = 'Elegí el barrio donde lo encontraste';
    }
    if (descripcion.length > DESCRIPCION_MAX) malos.descripcion = `Hasta ${DESCRIPCION_MAX} caracteres`;
    return malos;
  }

  async function enviar() {
    const malos = validar();
    setErrores(malos);
    setErrorPedido(null);
    if (Object.keys(malos).length > 0) return;

    setEnviando(true);
    try {
      const reclamo = await crearReclamo(publicacionId, {
        descripcion: descripcion.trim() || null,
        fotoUrl,
        ...(esMio ? { respuesta: respuesta.trim() } : { barrioId }),
      });
      setEnviado(reclamo);
    } catch (e) {
      // RESPUESTA_INCORRECTA llega acá con el mensaje que dice cuántos
      // intentos quedan: se muestra y se deja corregir. Los otros códigos no
      // tienen arreglo desde este formulario.
      setErrorPedido(e.message);
      if (CODIGOS_SIN_SALIDA.includes(e.codigo)) setSinSalida(true);
      if (e.codigo === 'RESPUESTA_INCORRECTA') setRespuesta('');
    } finally {
      setEnviando(false);
    }
  }

  // ---------------------------------------------------------------

  if (cargandoBarrios) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (enviado) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.exitoTitulo}>Reclamo enviado</Text>
        <Text style={styles.exitoTexto}>
          {esMio
            ? 'Contestaste bien la pregunta. Ahora el publicador decide si te lo devuelve.'
            : 'Le avisamos a quien lo perdió. Ahora decide si es lo suyo.'}
        </Text>
        <Text style={styles.exitoDetalle}>
          Tiene {enviado.horasParaVencer ?? 48} horas para responder. Lo seguís desde "Mis reclamos".
        </Text>

        <View style={styles.exitoBotones}>
          <Boton titulo="Ver mis reclamos" onPress={() => navigation.replace('MisReclamos')} />
          <Boton titulo="Volver a la publicación" onPress={() => navigation.goBack()} variante="secundario" />
        </View>
      </View>
    );
  }

  if (sinSalida) {
    return (
      <View style={styles.centrado}>
        <Aviso mensaje={errorPedido} tipo="info" />
        <Boton titulo="Volver a la publicación" onPress={() => navigation.goBack()} variante="secundario" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>{esMio ? 'Es mío' : 'Lo encontré'}</Text>
        <Text style={styles.publicacion}>{titulo}</Text>

        <Aviso mensaje={errorPedido} />

        {esMio ? (
          <>
            <View style={styles.pregunta}>
              <Text style={styles.preguntaEtiqueta}>Pregunta de verificación</Text>
              <Text style={styles.preguntaTexto}>{pregunta}</Text>
            </View>

            <CampoTexto
              etiqueta="Tu respuesta"
              placeholder="Respondé lo que sólo el dueño sabría"
              value={respuesta}
              onChangeText={setRespuesta}
              error={errores.respuesta}
              maxLength={RESPUESTA_MAX}
              autoCapitalize="none"
              ayuda="No importan las mayúsculas ni los acentos. Tenés hasta 3 intentos."
            />
          </>
        ) : (
          <SelectorLista
            etiqueta="¿En qué barrio lo encontraste?"
            placeholder="Elegí el barrio"
            tituloModal="¿Dónde lo encontraste?"
            opciones={barrios}
            valor={barrioId}
            onElegir={(v) => {
              setBarrioId(v);
              setErrores((previos) => ({ ...previos, barrio: undefined }));
            }}
            error={errores.barrio}
          />
        )}

        <Foto
          url={fotoUrl}
          subiendo={subiendoFoto}
          obligatoria={!esMio}
          error={errores.foto}
          onAgregar={agregarFoto}
          onQuitar={() => setFotoUrl(null)}
          ayuda={
            esMio
              ? 'Opcional: una foto que acredite que es tuyo (el ticket, una foto vieja con el objeto).'
              : 'Una foto de lo que encontraste, para que el dueño confirme si es lo suyo.'
          }
        />

        <CampoTexto
          etiqueta="Descripción (opcional)"
          placeholder={esMio ? 'Algún detalle más que lo identifique' : 'Dónde estaba, cómo está, dónde lo tenés'}
          value={descripcion}
          onChangeText={setDescripcion}
          error={errores.descripcion}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={styles.areaTexto}
        />

        <View style={styles.botones}>
          <Boton
            titulo="Enviar reclamo"
            onPress={enviar}
            cargando={enviando}
            deshabilitado={subiendoFoto}
          />
          <TouchableOpacity style={styles.volver} onPress={() => navigation.goBack()} disabled={enviando}>
            <Text style={styles.enlace}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------

function Foto({ url, subiendo, obligatoria, error, ayuda, onAgregar, onQuitar }) {
  return (
    <View style={styles.foto}>
      <Text style={styles.etiqueta}>{obligatoria ? 'Foto' : 'Foto (opcional)'}</Text>

      {url ? (
        <View style={styles.fotoFila}>
          <Image source={{ uri: urlDeFoto(url) }} style={styles.miniatura} />
          <TouchableOpacity onPress={onQuitar} hitSlop={8}>
            <Text style={styles.enlace}>Quitar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.agregar, error ? styles.agregarConError : null]}
          onPress={onAgregar}
          disabled={subiendo}
          activeOpacity={0.7}
        >
          {subiendo ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.agregarTexto}>+ Elegir de la galería</Text>
          )}
        </TouchableOpacity>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : <Text style={styles.ayuda}>{ayuda}</Text>}
    </View>
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
  publicacion: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  pregunta: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  preguntaEtiqueta: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  preguntaTexto: {
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: 'bold',
  },
  etiqueta: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  foto: {
    marginBottom: spacing.md,
  },
  fotoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  miniatura: {
    width: 104,
    height: 104,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  agregar: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.sm,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  agregarConError: {
    borderColor: colors.danger,
  },
  agregarTexto: {
    color: colors.primary,
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  ayuda: {
    marginTop: spacing.xs,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  error: {
    marginTop: spacing.xs,
    fontSize: fontSizes.xs,
    color: colors.danger,
  },
  areaTexto: {
    minHeight: 100,
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
    gap: spacing.sm,
  },
});
