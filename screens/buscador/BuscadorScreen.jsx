// Punto 3: el buscador guiado. Es la primera pantalla de la app.
//
// "Al ingresar a la app, la persona no ve un listado sino un buscador
// guiado." Por eso acá no hay ninguna lista: son cuatro preguntas, una por
// vez, y recién después aparecen los resultados.
//
// Las cuatro preguntas son las del enunciado:
//   ¿Qué te pasó?  perdí algo / encontré algo
//   ¿Qué es?       categoría y, opcionalmente, palabras clave
//   ¿Dónde?        un barrio de la lista, o la ubicación del dispositivo
//   ¿Cuándo?       hoy, últimos 3 días, última semana o un rango
//
// Mismo criterio que el wizard de publicar: un solo componente con un estado
// `paso`, porque los pasos comparten todo el formulario.
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import { useAuth } from '../../hooks/useAuth';
import {
  borrarBusquedas,
  guardarBusqueda,
  leerBusquedas,
} from '../../services/historialBusquedasService';
import { obtenerBarrios, obtenerCategorias } from '../../services/publicacionService';
import { ubicacionActual } from '../../services/ubicacionService';
import { hoyIso, isoATexto, isoDeHace, textoAIso } from '../../utils/fechas';
import { colors, fontSizes, radius, spacing } from '../../config/theme';

const QUE_TE_PASO = [
  { valor: 'PERDI', etiqueta: 'Perdí algo', ayuda: 'Te mostramos lo que otros encontraron' },
  { valor: 'ENCONTRE', etiqueta: 'Encontré algo', ayuda: 'Te mostramos lo que otros perdieron' },
];

const CUANDO = [
  { valor: 'HOY', etiqueta: 'Hoy' },
  { valor: 'TRES_DIAS', etiqueta: 'Últimos 3 días' },
  { valor: 'SEMANA', etiqueta: 'Última semana' },
  { valor: 'RANGO', etiqueta: 'Un rango de fechas' },
];

const PASOS = [
  { clave: 'queTePaso', titulo: '¿Qué te pasó?' },
  { clave: 'que', titulo: '¿Qué es?' },
  { clave: 'donde', titulo: '¿Dónde?' },
  { clave: 'cuando', titulo: '¿Cuándo?' },
];

export default function BuscadorScreen({ navigation }) {
  const { usuario } = useAuth();

  const [categorias, setCategorias] = useState([]);
  const [barrios, setBarrios] = useState([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [errorCatalogos, setErrorCatalogos] = useState(null);

  const [paso, setPaso] = useState(0);
  const [queTePaso, setQueTePaso] = useState(null);
  const [categoriaId, setCategoriaId] = useState(null);
  const [q, setQ] = useState('');
  const [barrioId, setBarrioId] = useState(null);
  const [coordenadas, setCoordenadas] = useState(null);
  const [cuando, setCuando] = useState(null);
  const [desdeTexto, setDesdeTexto] = useState(isoATexto(isoDeHace(7)));
  const [hastaTexto, setHastaTexto] = useState(isoATexto(hoyIso()));

  const [errores, setErrores] = useState({});
  const [ubicando, setUbicando] = useState(false);
  const [errorUbicacion, setErrorUbicacion] = useState(null);

  // Punto 3: "el buscador muestra las ultimas busquedas realizadas para
  // poder repetirlas con un toque".
  const [ultimas, setUltimas] = useState([]);

  useEffect(() => {
    cargarCatalogos();
  }, []);

  // Se releen cada vez que se vuelve a esta pantalla: si acaba de buscar,
  // esa busqueda tiene que aparecer arriba al volver.
  useFocusEffect(
    useCallback(() => {
      leerBusquedas(usuario?.id).then(setUltimas);
      // Y se vuelve al primer paso. Al volver de los resultados el wizard
      // quedaba en la ultima pregunta, y asi las ultimas busquedas no se
      // veian nunca, que es justo lo que el enunciado pide mostrar. Las
      // respuestas NO se borran: con tres toques en Continuar se vuelve
      // adonde estaba.
      setPaso(0);
    }, [usuario?.id])
  );

  async function cargarCatalogos() {
    setCargandoCatalogos(true);
    setErrorCatalogos(null);
    try {
      const [c, b] = await Promise.all([obtenerCategorias(), obtenerBarrios()]);
      setCategorias(c);
      setBarrios(b);
    } catch (e) {
      setErrorCatalogos(e.message);
    } finally {
      setCargandoCatalogos(false);
    }
  }

  const pasoActual = PASOS[paso];
  const esUltimo = paso === PASOS.length - 1;

  // Sólo la primera pregunta es obligatoria: sin ella el backend no sabe qué
  // devolver. Las otras tres acotan, y el enunciado las marca como opcionales
  // ("y, opcionalmente, palabras clave").
  function validarPaso(clave) {
    const malos = {};

    if (clave === 'queTePaso' && queTePaso === null) {
      malos.queTePaso = 'Elegí una de las dos';
    }

    if (clave === 'cuando' && cuando === 'RANGO') {
      const desde = textoAIso(desdeTexto);
      const hasta = textoAIso(hastaTexto);
      if (desde === null) malos.desde = 'Escribila como DD/MM/AAAA';
      if (hasta === null) malos.hasta = 'Escribila como DD/MM/AAAA';
      if (desde && hasta && desde > hasta) malos.hasta = 'Tiene que ser posterior a la primera';
      if (hasta && hasta > hoyIso()) malos.hasta = 'No puede ser una fecha futura';
    }

    return malos;
  }

  function avanzar() {
    const malos = validarPaso(pasoActual.clave);
    setErrores(malos);
    if (Object.keys(malos).length > 0) return;

    if (esUltimo) buscar();
    else setPaso(paso + 1);
  }

  function buscar() {
    const criterios = {
      queTePaso,
      categoriaId,
      q: q.trim(),
      barrioId,
      coordenadas,
      cuando,
      desde: cuando === 'RANGO' ? textoAIso(desdeTexto) : null,
      hasta: cuando === 'RANGO' ? textoAIso(hastaTexto) : null,
      // Si la persona compartió su ubicación, arrancamos por cercanía: es lo
      // que más le sirve a alguien que busca algo que perdió cerca.
      orden: coordenadas ? 'CERCANOS' : 'RECIENTES',
    };

    // Para que los resultados puedan mostrar los nombres sin volver a pedir
    // los catálogos.
    const etiquetas = {
      categoria: categorias.find((c) => c.id === categoriaId)?.nombre ?? null,
      barrio: barrios.find((b) => b.id === barrioId)?.nombre ?? null,
    };

    guardarBusqueda(usuario?.id, criterios, etiquetas);
    navigation.navigate('Resultados', { criterios, etiquetas });
  }

  // Repetir una busqueda guardada es ir derecho a los resultados: no tiene
  // sentido hacerle contestar de nuevo las cuatro preguntas.
  function repetir(busqueda) {
    navigation.navigate('Resultados', {
      criterios: busqueda.criterios,
      etiquetas: busqueda.etiquetas,
    });
  }

  async function limpiarUltimas() {
    await borrarBusquedas(usuario?.id);
    setUltimas([]);
  }

  async function tomarUbicacion() {
    setErrorUbicacion(null);
    setUbicando(true);
    try {
      setCoordenadas(await ubicacionActual());
      // La ubicación y el barrio son dos formas de contestar la misma
      // pregunta: si eligió una, la otra sobra.
      setBarrioId(null);
    } catch (e) {
      setErrorUbicacion(e.message);
    } finally {
      setUbicando(false);
    }
  }

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

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        {paso === 0 ? (
          <Text style={styles.saludo}>Hola, {usuario?.nombre ?? 'vecino'}</Text>
        ) : null}

        <PasosIndicador paso={paso} total={PASOS.length} titulo={pasoActual.titulo} />

        {pasoActual.clave === 'queTePaso' ? (
          <SelectorOpciones
            opciones={QUE_TE_PASO}
            valor={queTePaso}
            onElegir={(v) => {
              setQueTePaso(v);
              setErrores({});
            }}
            error={errores.queTePaso}
            columnas
          />
        ) : null}

        {pasoActual.clave === 'que' ? (
          <>
            <SelectorOpciones
              etiqueta="Categoría (opcional)"
              opciones={categorias.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
              valor={categoriaId}
              onElegir={(v) => setCategoriaId(v === categoriaId ? null : v)}
            />

            <CampoTexto
              etiqueta="Palabras clave (opcional)"
              placeholder={queTePaso === 'PERDI' ? 'mochila negra' : 'llavero'}
              value={q}
              onChangeText={setQ}
              maxLength={80}
              autoCapitalize="none"
              ayuda="Buscamos en el título y en la descripción"
            />

            <Text style={styles.nota}>
              Tocá la categoría de nuevo para quitarla. Dejando todo vacío buscamos en todo.
            </Text>
          </>
        ) : null}

        {pasoActual.clave === 'donde' ? (
          <>
            <SelectorLista
              etiqueta="Barrio o localidad (opcional)"
              placeholder="Elegí el barrio"
              tituloModal="¿En qué barrio?"
              opciones={barrios}
              valor={barrioId}
              onElegir={(v) => {
                setBarrioId(v);
                setCoordenadas(null);
              }}
            />

            <Text style={styles.separadorTexto}>o</Text>

            <Aviso mensaje={errorUbicacion} />

            <Boton
              titulo={coordenadas ? 'Actualizar mi ubicación' : 'Buscar cerca mío'}
              onPress={tomarUbicacion}
              cargando={ubicando}
              variante="secundario"
            />

            <Text style={styles.nota}>
              {coordenadas
                ? 'Listo: vamos a ordenar los resultados por cercanía desde donde estás.'
                : 'Si compartís tu ubicación, ordenamos los resultados por cercanía.'}
            </Text>
          </>
        ) : null}

        {pasoActual.clave === 'cuando' ? (
          <>
            <SelectorOpciones
              opciones={CUANDO}
              valor={cuando}
              onElegir={(v) => {
                setCuando(v === cuando ? null : v);
                setErrores({});
              }}
            />

            {cuando === 'RANGO' ? (
              <View style={styles.rango}>
                <CampoTexto
                  etiqueta="Desde"
                  placeholder="DD/MM/AAAA"
                  value={desdeTexto}
                  onChangeText={setDesdeTexto}
                  error={errores.desde}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
                <CampoTexto
                  etiqueta="Hasta"
                  placeholder="DD/MM/AAAA"
                  value={hastaTexto}
                  onChangeText={setHastaTexto}
                  error={errores.hasta}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
              </View>
            ) : null}

            <Text style={styles.nota}>
              Si no elegís ninguna, buscamos sin límite de fecha.
            </Text>
          </>
        ) : null}

        {paso === 0 && ultimas.length > 0 ? (
          <View style={styles.ultimas}>
            <View style={styles.ultimasEncabezado}>
              <Text style={styles.ultimasTitulo}>Tus últimas búsquedas</Text>
              <TouchableOpacity onPress={limpiarUltimas} hitSlop={8}>
                <Text style={styles.enlace}>Borrar</Text>
              </TouchableOpacity>
            </View>

            {ultimas.map((busqueda) => (
              <TouchableOpacity
                key={busqueda.id}
                style={styles.ultima}
                onPress={() => repetir(busqueda)}
                activeOpacity={0.7}
              >
                <Text style={styles.ultimaTexto} numberOfLines={1}>
                  {busqueda.resumen}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <View style={styles.botones}>
          <Boton titulo={esUltimo ? 'Buscar' : 'Continuar'} onPress={avanzar} />

          {paso > 0 ? (
            <TouchableOpacity style={styles.volver} onPress={() => setPaso(paso - 1)}>
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
  saludo: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  nota: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  separadorTexto: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    marginBottom: spacing.md,
  },
  rango: {
    marginTop: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    paddingLeft: spacing.md,
    borderRadius: radius.sm,
  },
  ultimas: {
    marginTop: spacing.lg,
  },
  ultimasEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  ultimasTitulo: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ultima: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  ultimaTexto: {
    fontSize: fontSizes.sm,
    color: colors.text,
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
});
