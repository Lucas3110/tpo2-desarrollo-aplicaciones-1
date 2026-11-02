// Punto 5 y Punto 6: "Carga guiada en pasos", con cola de salida offline.
//
// Por qué un solo componente con un estado `paso` y no varias pantallas del
// navigator: los pasos comparten TODO el formulario. Si cada paso fuera una
// pantalla habría que ir pasando el borrador entero de una a otra por
// route.params, que es exactamente el prop drilling del que hablamos en
// clase. Acá el formulario vive en un lugar y los pasos sólo deciden qué
// parte se muestra.
//
// Los pasos salen del enunciado: elegir el tipo, las fotos, los datos del
// objeto, y el barrio y la dirección. El paso de verificación aparece sólo
// en las de tipo ENCONTRE, porque la pregunta la carga quien encontró algo.
//
// Punto 6:
// - Se apoya en `borradorService.js` mientras se completan los pasos.
// - Si al tocar "Publicar" no hay red, `crearPublicacion` guarda la
//   publicación en la tabla `publicaciones_pendientes` de WatermelonDB,
//   limpia el borrador y `NetworkContext` la envía automáticamente a
//   `POST /hallado/publicaciones` al recuperar la conexión.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  BackHandler,
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
import SelectorFotos from '../../components/SelectorFotos';
import SelectorLista from '../../components/SelectorLista';
import SelectorOpciones from '../../components/SelectorOpciones';
import { useAuth } from '../../hooks/useAuth';
import { useNetworkState } from '../../hooks/useNetworkState';
import {
  borrarBorrador,
  describirBorrador,
  guardarBorrador,
  leerBorrador,
  valeLaPenaGuardar,
} from '../../services/borradorService';
import {
  crearPublicacion,
  obtenerBarrios,
  obtenerCategorias,
} from '../../services/publicacionService';
import {
  direccionDeCoordenadas,
  formatearCoordenadas,
  ubicacionActual,
} from '../../services/ubicacionService';
import {
  ATAJOS_FECHA,
  describirFecha,
  hoyIso,
  isoATexto,
  isoDeHace,
  textoAIso,
} from '../../utils/fechas';
import { TEXTOS } from '../../utils/mensajesConexion';
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

export default function PublicarScreen({ navigation, route }) {
  const { usuario } = useAuth();
  const { conectado, motivoOffline, refrescarContadorPendientes } = useNetworkState();

  // Catálogos
  const [categorias, setCategorias] = useState([]);
  const [barrios, setBarrios] = useState([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [errorCatalogos, setErrorCatalogos] = useState(null);

  // Formulario
  const [tipo, setTipo] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [categoriaId, setCategoriaId] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaIso, setFechaIso] = useState(hoyIso());
  const [fechaTexto, setFechaTexto] = useState(isoATexto(hoyIso()));
  const [franja, setFranja] = useState('NO_SE');
  const [barrioId, setBarrioId] = useState(null);
  const [direccion, setDireccion] = useState('');
  const [coordenadas, setCoordenadas] = useState(null);
  const [ubicando, setUbicando] = useState(false);
  const [errorUbicacion, setErrorUbicacion] = useState(null);
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');

  // Navegación del wizard
  const [paso, setPaso] = useState(0);
  const [errores, setErrores] = useState({});
  const [errorPedido, setErrorPedido] = useState(null);
  const [publicando, setPublicando] = useState(false);
  const [publicada, setPublicada] = useState(null);

  // Borrador
  const [borradorPendiente, setBorradorPendiente] = useState(null);
  const [borradorListo, setBorradorListo] = useState(false);

  // Se guarda en un ref (y no se lee de `categorias.length`) para que
  // `cargarCatalogos` tenga una identidad estable: si dependiera del largo de
  // las listas, cambiaría al cargarlas y useFocusEffect volvería a dispararse.
  const tieneCatalogos = useRef(false);

  const cargarCatalogos = useCallback(async () => {
    if (!tieneCatalogos.current) setCargandoCatalogos(true);
    setErrorCatalogos(null);
    try {
      const [c, b] = await Promise.all([obtenerCategorias(), obtenerBarrios()]);
      setCategorias(c);
      setBarrios(b);
      tieneCatalogos.current = c.length > 0 && b.length > 0;
    } catch (e) {
      // Si ya hay listas en pantalla se conservan; solo se avisa si no hay nada
      // (primera vez sin conexión y sin copia guardada).
      if (!tieneCatalogos.current) {
        setErrorCatalogos(e.message);
      }
    } finally {
      setCargandoCatalogos(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarCatalogos();
    }, [cargarCatalogos])
  );

  // Al recuperar la conexión se piden de nuevo las listas reales: las que había
  // en pantalla pueden venir de la copia guardada y estar desactualizadas.
  const estabaConectado = useRef(conectado);
  useEffect(() => {
    if (conectado && !estabaConectado.current) cargarCatalogos();
    estabaConectado.current = conectado;
  }, [conectado, cargarCatalogos]);

  // Al entrar, miramos si quedó algo a medio cargar de la vez anterior. No se
  // restaura solo: se le pregunta.
  useFocusEffect(
    useCallback(() => {
      if (borradorListo) return;
      const buscar = async () => {
        const guardado = await leerBorrador(usuario?.id);
        // Si llegó con `retomar` (viene de "Editar" en una publicación que el
        // servidor rechazó), no se pregunta: el efecto de abajo lo carga directo.
        if (guardado && !route?.params?.retomar) setBorradorPendiente(guardado);
        setBorradorListo(true);
      };
      buscar();
    }, [usuario?.id, borradorListo, route?.params?.retomar])
  );

  // "Editar" en Mis publicaciones deja la publicación rechazada como borrador y
  // abre esta pantalla con `retomar`. Se carga en el formulario sin preguntar.
  // Se mira el parámetro en un efecto (y no solo al enfocar) porque la pantalla
  // puede estar ya abierta en la pila y entonces no se vuelve a montar.
  useEffect(() => {
    if (!route?.params?.retomar || !usuario?.id) return undefined;

    let cancelado = false;
    (async () => {
      const guardado = await leerBorrador(usuario.id);
      if (cancelado || !guardado) return;
      aplicarBorrador(guardado.datos);
      setBorradorPendiente(null);
      setPublicada(null);
      setErrores({});
      setErrorPedido(null);
      setBorradorListo(true);
      navigation.setParams({ retomar: undefined });
    })();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.retomar, usuario?.id]);

  // Y cada vez que cambia algo del formulario local, actualizamos el borrador.
  useEffect(() => {
    if (!borradorListo || publicada) return;

    const datos = formularioActual();
    if (valeLaPenaGuardar(datos)) guardarBorrador(usuario?.id, datos);
  }, [
    borradorListo,
    publicada,
    usuario?.id,
    tipo,
    fotos,
    categoriaId,
    titulo,
    descripcion,
    fechaTexto,
    franja,
    barrioId,
    direccion,
    coordenadas,
    pregunta,
    respuesta,
    paso,
  ]);

  function formularioActual() {
    return {
      tipo,
      fotos,
      categoriaId,
      titulo,
      descripcion,
      fechaTexto,
      franja,
      barrioId,
      direccion,
      coordenadas,
      pregunta,
      respuesta,
      paso,
    };
  }

  function restaurarBorrador() {
    aplicarBorrador(borradorPendiente.datos);
    setBorradorPendiente(null);
  }

  function aplicarBorrador(d) {
    setTipo(d.tipo ?? null);
    setFotos(d.fotos ?? []);
    setCategoriaId(d.categoriaId ?? null);
    setTitulo(d.titulo ?? '');
    setDescripcion(d.descripcion ?? '');
    setFechaTexto(d.fechaTexto ?? isoATexto(hoyIso()));
    setFranja(d.franja ?? 'NO_SE');
    setBarrioId(d.barrioId ?? null);
    setDireccion(d.direccion ?? '');
    setCoordenadas(d.coordenadas ?? null);
    setPregunta(d.pregunta ?? '');
    setRespuesta(d.respuesta ?? '');
    const total = d.tipo === 'ENCONTRE' ? 6 : 5;
    setPaso(Math.min(d.paso ?? 0, total - 1));
  }

  async function descartarBorrador() {
    await borrarBorrador(usuario?.id);
    setBorradorPendiente(null);
  }

  const pasos = [
    { clave: 'tipo', titulo: '¿Qué te pasó?' },
    { clave: 'fotos', titulo: 'Fotos' },
    { clave: 'que', titulo: '¿Qué es?' },
    { clave: 'cuando', titulo: '¿Cuándo fue?' },
    { clave: 'donde', titulo: '¿Dónde?' },
    ...(tipo === 'ENCONTRE' ? [{ clave: 'verificacion', titulo: 'Pregunta de verificación' }] : []),
  ];
  const pasoActual = pasos[paso];
  const esUltimo = paso === pasos.length - 1;

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

    if (pasoActual.clave === 'cuando') setFechaIso(textoAIso(fechaTexto));

    if (esUltimo) publicar();
    else setPaso(paso + 1);
  }

  function retroceder() {
    setErrores({});
    setErrorPedido(null);
    setPaso(Math.max(0, paso - 1));
  }

  // El boton de atras de Android tiene que retroceder un PASO, no salirse de
  // la carga entera.
  //
  // Sin esto, estando en "Fotos" y tocando atras te sacaba al menu y perdias
  // de vista el formulario: la navegacion no sabe nada de los seis pasos,
  // para ella "Publicar" es una pantalla sola.
  //
  // Devolver true significa "ya lo manejamos yo". En el primer paso se
  // devuelve false para que el back salga de Publicar, que es lo que se
  // espera ahi. Lo que se habia cargado no se pierde: queda en el borrador.
  useFocusEffect(
    useCallback(() => {
      const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => {
        if (publicando || paso === 0) return false;
        retroceder();
        return true;
      });
      return () => suscripcion.remove();
    }, [paso, publicando])
  );

  async function publicar() {
    setPublicando(true);
    setErrorPedido(null);
    try {
      const barrioNombre = barrios.find((b) => b.id === barrioId)?.nombre ?? null;
      const categoriaNombre = categorias.find((c) => c.id === categoriaId)?.nombre ?? null;

      const creada = await crearPublicacion(
        {
          tipo,
          categoriaId,
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || null,
          fechaSuceso: textoAIso(fechaTexto),
          franjaHoraria: franja,
          barrioId,
          direccion: direccion.trim() || null,
          fotos,
          ...(coordenadas ? { lat: coordenadas.lat, lng: coordenadas.lng } : {}),
          ...(tipo === 'ENCONTRE'
            ? {
                preguntaVerificacion: pregunta.trim(),
                respuestaVerificacion: respuesta.trim(),
              }
            : {}),
        },
        {
          usuarioId: usuario?.id,
          barrioNombre,
          categoriaNombre,
        }
      );

      setPublicada(creada);
      await borrarBorrador(usuario?.id);
      await refrescarContadorPendientes();
    } catch (e) {
      setErrorPedido(e.message);
    } finally {
      setPublicando(false);
    }
  }

  async function tomarUbicacion() {
    setErrorUbicacion(null);
    setUbicando(true);
    try {
      const punto = await ubicacionActual();
      setCoordenadas(punto);

      if (direccion.trim() === '') {
        const calle = await direccionDeCoordenadas(punto);
        if (calle) setDireccion(calle);
      }
    } catch (e) {
      setErrorUbicacion(e.message);
    } finally {
      setUbicando(false);
    }
  }

  function empezarDeNuevo() {
    borrarBorrador(usuario?.id);
    setPublicada(null);
    setPaso(0);
    setTipo(null);
    setFotos([]);
    setCategoriaId(null);
    setTitulo('');
    setDescripcion('');
    setFechaIso(hoyIso());
    setFechaTexto(isoATexto(hoyIso()));
    setFranja('NO_SE');
    setBarrioId(null);
    setDireccion('');
    setCoordenadas(null);
    setErrorUbicacion(null);
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

  if (borradorPendiente) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.exitoTitulo}>Tenés algo a medio cargar</Text>
        <Text style={styles.exitoTexto}>
          Dejaste sin publicar {describirBorrador(borradorPendiente.datos)}.
        </Text>

        <View style={styles.exitoBotones}>
          <Boton titulo="Seguir donde lo dejé" onPress={restaurarBorrador} />
          <Boton titulo="Empezar de cero" onPress={descartarBorrador} variante="secundario" />
        </View>
      </View>
    );
  }

  if (publicada) {
    const esPendiente = Boolean(publicada.pendienteDeEnvio);

    return (
      <View style={styles.centrado}>
        <Text style={[styles.exitoTitulo, esPendiente ? styles.pendienteTitulo : null]}>
          {esPendiente ? 'Pendiente de envío' : '¡Listo!'}
        </Text>

        {esPendiente ? (
          <Aviso
            tipo="info"
            mensaje={TEXTOS.publicacionGuardada(publicada.causaEncolado)}
          />
        ) : (
          <Text style={styles.exitoTexto}>
            {publicada.tipo === 'PERDI'
              ? 'Publicamos tu pérdida. Te avisamos si alguien encuentra algo parecido.'
              : 'Publicamos tu hallazgo. Ojalá aparezca su dueño.'}
          </Text>
        )}

        <Text style={styles.exitoDetalle}>
          {publicada.titulo} · {publicada.barrio?.nombre ?? ''}
        </Text>
        {publicada.venceEn ? (
          <Text style={styles.exitoDetalle}>
            Vence el {isoATexto(String(publicada.venceEn).slice(0, 10))}
          </Text>
        ) : null}

        <View style={styles.exitoBotones}>
          <Boton
            titulo="Ver mis publicaciones"
            // `replace` y no `navigate`: si no, al volver con "atrás" desde Mis
            // publicaciones aparecería otra vez esta confirmación, con un
            // "Pendiente de envío" de algo que ya se envió.
            onPress={() => navigation.replace('MisPublicaciones')}
          />
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

        {!conectado ? (
          <Aviso
            tipo="info"
            mensaje={TEXTOS.cargaOffline(motivoOffline)}
          />
        ) : null}

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

        {pasoActual.clave === 'fotos' ? (
          <>
            <Text style={styles.explicacion}>
              {tipo === 'PERDI'
                ? 'Si tenés una foto de lo que perdiste, ayuda un montón a que alguien lo reconozca.'
                : 'Mostrá lo que encontraste, pero sin el detalle que vas a preguntar después para verificar.'}
            </Text>
            <SelectorFotos urls={fotos} onCambiar={setFotos} />
            <Text style={styles.explicacion}>Podés seguir sin fotos y agregarlas después.</Text>
          </>
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

            <Aviso mensaje={errorUbicacion} />

            <Boton
              titulo={coordenadas ? 'Actualizar mi ubicación' : 'Usar mi ubicación actual'}
              onPress={tomarUbicacion}
              cargando={ubicando}
              variante="secundario"
            />

            <Text style={styles.explicacion}>
              {coordenadas
                ? `Coordenadas guardadas: ${formatearCoordenadas(coordenadas)}`
                : 'Las coordenadas ayudan a que te encuentren por cercanía. Son opcionales.'}
            </Text>
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
            titulo={esUltimo ? (conectado ? 'Publicar' : 'Guardar para enviar') : 'Continuar'}
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
  pendienteTitulo: {
    color: '#8D6E00',
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
