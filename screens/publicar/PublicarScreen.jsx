// Punto 5: "Carga guiada en pasos".
//
// Por qué un solo componente con un estado `paso` y no varias pantallas del
// navigator: los pasos comparten TODO el formulario. Si cada paso fuera una
// pantalla habría que ir pasando el borrador entero de una a otra por
// route.params, que es exactamente el prop drilling del que hablamos en
// clase. Acá el formulario vive en un lugar y los pasos sólo deciden qué
// parte se muestra. Además deja el borrador (que viene en otra rama) en un
// solo objeto, listo para guardar.
//
// Los pasos salen del enunciado: elegir el tipo, las fotos, los datos del
// objeto, y el barrio y la dirección. El paso de verificación aparece sólo
// en las de tipo ENCONTRE, porque la pregunta la carga quien encontró algo.
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import PasosIndicador from '../../components/PasosIndicador';
import SelectorLista from '../../components/SelectorLista';
import SelectorOpciones from '../../components/SelectorOpciones';
import {
  crearPublicacion,
  obtenerBarrios,
  obtenerCategorias,
} from '../../services/publicacionService';
import {
  ATAJOS_FECHA,
  describirFecha,
  hoyIso,
  isoATexto,
  isoDeHace,
  textoAIso,
} from '../../utils/fechas';
import { colors, fontSizes, radius, spacing } from '../../config/theme';

const TIPOS = [
  { valor: 'PERDI', etiqueta: 'Perdí algo', ayuda: 'Vas a ver lo que otros encontraron' },
  { valor: 'ENCONTRE', etiqueta: 'Encontré algo', ayuda: 'Vas a ver lo que otros perdieron' },
];

const FRANJAS = [
  { valor: 'MANANA', etiqueta: 'A la mañana' },
  { valor: 'TARDE', etiqueta: 'A la tarde' },
  { valor: 'NOCHE', etiqueta: 'A la noche' },
  { valor: 'NO_SE', etiqueta: 'No me acuerdo' },
];

const TITULO_MAX = 80;
const DESCRIPCION_MAX = 2000;

export default function PublicarScreen({ navigation }) {
  // Catálogos
  const [categorias, setCategorias] = useState([]);
  const [barrios, setBarrios] = useState([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [errorCatalogos, setErrorCatalogos] = useState(null);

  // Formulario
  const [tipo, setTipo] = useState(null);
  const [categoriaId, setCategoriaId] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaIso, setFechaIso] = useState(hoyIso());
  const [fechaTexto, setFechaTexto] = useState(isoATexto(hoyIso()));
  const [franja, setFranja] = useState('NO_SE');
  const [barrioId, setBarrioId] = useState(null);
  const [direccion, setDireccion] = useState('');
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');

  // Navegación del wizard
  const [paso, setPaso] = useState(0);
  const [errores, setErrores] = useState({});
  const [errorPedido, setErrorPedido] = useState(null);
  const [publicando, setPublicando] = useState(false);
  const [publicada, setPublicada] = useState(null);

  useEffect(() => {
    cargarCatalogos();
  }, []);

  async function cargarCatalogos() {
    setCargandoCatalogos(true);
    setErrorCatalogos(null);
    try {
      // En paralelo: son dos pedidos que no dependen entre sí.
      const [c, b] = await Promise.all([obtenerCategorias(), obtenerBarrios()]);
      setCategorias(c);
      setBarrios(b);
    } catch (e) {
      setErrorCatalogos(e.message);
    } finally {
      setCargandoCatalogos(false);
    }
  }

  // El paso de verificación sólo existe si encontró algo. Se calcula en vez
  // de guardarse para que cambiar el tipo en el paso 1 reordene todo solo.
  const pasos = [
    { clave: 'tipo', titulo: '¿Qué te pasó?' },
    { clave: 'que', titulo: '¿Qué es?' },
    { clave: 'cuando', titulo: '¿Cuándo fue?' },
    { clave: 'donde', titulo: '¿Dónde?' },
    ...(tipo === 'ENCONTRE' ? [{ clave: 'verificacion', titulo: 'Pregunta de verificación' }] : []),
  ];
  const pasoActual = pasos[paso];
  const esUltimo = paso === pasos.length - 1;

  // Cada paso dice qué está mal. Devuelve {} si está todo bien.
  function validarPaso(clave) {
    const malos = {};

    if (clave === 'tipo' && tipo === null) {
      malos.tipo = 'Elegí una de las dos';
    }

    if (clave === 'que') {
      if (categoriaId === null) malos.categoria = 'Elegí una categoría';
      const t = titulo.trim();
      if (t === '') malos.titulo = 'Poné un título';
      else if (t.length > TITULO_MAX) malos.titulo = `Hasta ${TITULO_MAX} caracteres`;
      if (descripcion.length > DESCRIPCION_MAX) {
        malos.descripcion = `Hasta ${DESCRIPCION_MAX} caracteres`;
      }
    }

    if (clave === 'cuando') {
      const iso = textoAIso(fechaTexto);
      if (iso === null) malos.fecha = 'Escribila como DD/MM/AAAA';
      else if (iso > hoyIso()) malos.fecha = 'No puede ser una fecha futura';
    }

    if (clave === 'donde' && barrioId === null) {
      malos.barrio = 'Elegí el barrio';
    }

    if (clave === 'verificacion') {
      if (pregunta.trim() === '') malos.pregunta = 'Escribí la pregunta';
      if (respuesta.trim() === '') malos.respuesta = 'Escribí la respuesta';
    }

    return malos;
  }

  function avanzar() {
    const malos = validarPaso(pasoActual.clave);
    setErrores(malos);
    setErrorPedido(null);
    if (Object.keys(malos).length > 0) return;

    // Al salir del paso de la fecha, el texto pasa a ser la fecha de verdad.
    if (pasoActual.clave === 'cuando') setFechaIso(textoAIso(fechaTexto));

    if (esUltimo) publicar();
    else setPaso(paso + 1);
  }

  function retroceder() {
    setErrores({});
    setErrorPedido(null);
    setPaso(Math.max(0, paso - 1));
  }

  async function publicar() {
    setPublicando(true);
    setErrorPedido(null);
    try {
      const creada = await crearPublicacion({
        tipo,
        categoriaId,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        fechaSuceso: textoAIso(fechaTexto),
        franjaHoraria: franja,
        barrioId,
        direccion: direccion.trim() || null,
        // Sólo van en las de ENCONTRE: el backend rechaza una pérdida que las
        // traiga, así que no se mandan "por las dudas".
        ...(tipo === 'ENCONTRE'
          ? { preguntaVerificacion: pregunta.trim(), respuestaVerificacion: respuesta.trim() }
          : {}),
      });
      setPublicada(creada);
    } catch (e) {
      setErrorPedido(e.message);
    } finally {
      setPublicando(false);
    }
  }

  function empezarDeNuevo() {
    setPublicada(null);
    setPaso(0);
    setTipo(null);
    setCategoriaId(null);
    setTitulo('');
    setDescripcion('');
    setFechaIso(hoyIso());
    setFechaTexto(isoATexto(hoyIso()));
    setFranja('NO_SE');
    setBarrioId(null);
    setDireccion('');
    setPregunta('');
    setRespuesta('');
    setErrores({});
    setErrorPedido(null);
  }

  // ---------------------------------------------------------------
  // Pantallas de borde
  // ---------------------------------------------------------------

  if (cargandoCatalogos) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (errorCatalogos) {
    return (
      <View style={styles.centrado}>
        <Aviso mensaje={errorCatalogos} />
        <Boton titulo="Reintentar" onPress={cargarCatalogos} />
      </View>
    );
  }

  if (publicada) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.exitoTitulo}>¡Listo!</Text>
        <Text style={styles.exitoTexto}>
          {publicada.tipo === 'PERDI'
            ? 'Publicamos tu pérdida. Te avisamos si alguien encuentra algo parecido.'
            : 'Publicamos tu hallazgo. Ojalá aparezca su dueño.'}
        </Text>
        <Text style={styles.exitoDetalle}>
          {publicada.titulo} · {publicada.barrio.nombre}
        </Text>
        <Text style={styles.exitoDetalle}>
          Vence el {isoATexto(String(publicada.venceEn).slice(0, 10))}
        </Text>

        <View style={styles.exitoBotones}>
          <Boton titulo="Ver mis publicaciones" onPress={() => navigation.navigate('MisPublicaciones')} />
          <Boton titulo="Publicar otra" onPress={empezarDeNuevo} variante="secundario" />
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------
  // El wizard
  // ---------------------------------------------------------------

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <PasosIndicador paso={paso} total={pasos.length} titulo={pasoActual.titulo} />

        <Aviso mensaje={errorPedido} />

        {pasoActual.clave === 'tipo' ? (
          <SelectorOpciones
            opciones={TIPOS}
            valor={tipo}
            onElegir={(v) => {
              setTipo(v);
              setErrores({});
            }}
            error={errores.tipo}
            columnas
          />
        ) : null}

        {pasoActual.clave === 'que' ? (
          <>
            <SelectorOpciones
              etiqueta="Categoría"
              opciones={categorias.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
              valor={categoriaId}
              onElegir={setCategoriaId}
              error={errores.categoria}
            />

            <CampoTexto
              etiqueta="Título"
              placeholder={tipo === 'PERDI' ? 'Mochila negra' : 'Llavero con tres llaves'}
              value={titulo}
              onChangeText={setTitulo}
              error={errores.titulo}
              maxLength={TITULO_MAX}
              ayuda="Una frase corta que lo describa"
            />

            <CampoTexto
              etiqueta="Descripción (opcional)"
              placeholder="Detalles que ayuden a reconocerlo"
              value={descripcion}
              onChangeText={setDescripcion}
              error={errores.descripcion}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={styles.areaTexto}
            />
          </>
        ) : null}

        {pasoActual.clave === 'cuando' ? (
          <>
            {/* Los atajos resuelven la mayoría de los casos: quien perdió algo
                se acuerda si fue hoy o ayer, no la fecha exacta. */}
            <View style={styles.atajos}>
              {ATAJOS_FECHA.map((atajo) => {
                const iso = isoDeHace(atajo.dias);
                const elegido = textoAIso(fechaTexto) === iso;
                return (
                  <TouchableOpacity
                    key={atajo.etiqueta}
                    style={[styles.atajo, elegido ? styles.atajoElegido : null]}
                    onPress={() => {
                      setFechaTexto(isoATexto(iso));
                      setErrores({});
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.atajoTexto, elegido ? styles.atajoTextoElegido : null]}>
                      {atajo.etiqueta}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <CampoTexto
              etiqueta="O escribí la fecha"
              placeholder="DD/MM/AAAA"
              value={fechaTexto}
              onChangeText={setFechaTexto}
              error={errores.fecha}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              ayuda={
                textoAIso(fechaTexto) ? `Fue ${describirFecha(textoAIso(fechaTexto))}` : undefined
              }
            />

            <SelectorOpciones
              etiqueta="¿A qué hora, más o menos?"
              opciones={FRANJAS}
              valor={franja}
              onElegir={setFranja}
            />
          </>
        ) : null}

        {pasoActual.clave === 'donde' ? (
          <>
            <SelectorLista
              etiqueta="Barrio o localidad"
              placeholder="Elegí el barrio"
              tituloModal="¿En qué barrio?"
              opciones={barrios}
              valor={barrioId}
              onElegir={setBarrioId}
              error={errores.barrio}
            />

            <CampoTexto
              etiqueta="Dirección exacta (opcional)"
              placeholder="Thames 1500"
              value={direccion}
              onChangeText={setDireccion}
              ayuda={
                tipo === 'ENCONTRE'
                  ? 'Nadie la ve hasta que aceptes un reclamo'
                  : 'Nadie la ve hasta que aceptes a quien lo encontró'
              }
            />
          </>
        ) : null}

        {pasoActual.clave === 'verificacion' ? (
          <>
            <Text style={styles.explicacion}>
              Preguntá por algo que no se vea en las fotos. Quien diga que es suyo va a tener que
              contestarlo, y así te asegurás de devolvérselo a la persona correcta.
            </Text>

            <CampoTexto
              etiqueta="Tu pregunta"
              placeholder="¿De qué color es el llavero?"
              value={pregunta}
              onChangeText={setPregunta}
              error={errores.pregunta}
              maxLength={255}
            />

            <CampoTexto
              etiqueta="La respuesta"
              placeholder="Azul"
              value={respuesta}
              onChangeText={setRespuesta}
              error={errores.respuesta}
              maxLength={255}
              ayuda="Esto no lo ve nadie más que vos"
            />
          </>
        ) : null}

        <View style={styles.botones}>
          <Boton
            titulo={esUltimo ? 'Publicar' : 'Continuar'}
            onPress={avanzar}
            cargando={publicando}
          />

          {paso > 0 ? (
            <TouchableOpacity style={styles.volver} onPress={retroceder} disabled={publicando}>
              <Text style={styles.enlace}>Volver</Text>
            </TouchableOpacity>
          ) : null}
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
  areaTexto: {
    minHeight: 100,
  },
  atajos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  atajo: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  atajoElegido: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  atajoTexto: {
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  atajoTextoElegido: {
    color: colors.white,
    fontWeight: 'bold',
  },
  explicacion: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
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
  },
  exitoBotones: {
    marginTop: spacing.xl,
    width: '100%',
    gap: spacing.sm,
  },
});
