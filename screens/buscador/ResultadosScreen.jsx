// Punto 3: la pantalla de resultados.
//
// "La pantalla de resultados es un listado paginado. [...] Desde los
// resultados se pueden refinar los filtros sin volver al inicio, y ordenarlos
// por más recientes o más cercanos. Si no hay resultados, la app ofrece
// publicar la propia pérdida o hallazgo, o guardar la búsqueda como alerta."
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
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
import SelectorOpciones from '../../components/SelectorOpciones';
import TarjetaResultado from '../../components/TarjetaResultado';
import {
  buscarPublicaciones,
  obtenerBarrios,
  obtenerCategorias,
} from '../../services/publicacionService';
import { colors, fontSizes, radius, spacing } from '../../config/theme';

const CUANDO = [
  { valor: null, etiqueta: 'Cualquier fecha' },
  { valor: 'HOY', etiqueta: 'Hoy' },
  { valor: 'TRES_DIAS', etiqueta: '3 días' },
  { valor: 'SEMANA', etiqueta: 'Semana' },
];

const LIMITE = 10;

export default function ResultadosScreen({ navigation, route }) {
  const { criterios: criteriosIniciales, etiquetas } = route.params;

  const [criterios, setCriterios] = useState(criteriosIniciales);
  // null = todavia no cargo nunca. [] = cargo y no hay resultados. Son dos
  // cosas distintas: la primera merece el spinner de pantalla completa, la
  // segunda el estado "sin resultados".
  const [publicaciones, setPublicaciones] = useState(null);
  const [paginado, setPaginado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(null);

  const [panelAbierto, setPanelAbierto] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [barrios, setBarrios] = useState([]);

  // Los catálogos se piden una sola vez, para el panel de refinar.
  useEffect(() => {
    Promise.all([obtenerCategorias(), obtenerBarrios()])
      .then(([c, b]) => {
        setCategorias(c);
        setBarrios(b);
      })
      .catch(() => {
        // Si fallan, el panel queda sin listas pero los resultados se ven
        // igual. No vale cortar la pantalla por esto.
      });
  }, []);

  const buscar = useCallback(
    async (criteriosNuevos, { pagina = 1, esRefresco = false } = {}) => {
      if (pagina === 1 && !esRefresco) setCargando(true);
      if (pagina > 1) setCargandoMas(true);
      setError(null);

      try {
        const datos = await buscarPublicaciones({
          ...criteriosNuevos,
          pagina,
          limite: LIMITE,
        });

        // La primera página reemplaza; las siguientes se suman.
        setPublicaciones((previas) =>
          pagina === 1 ? datos.publicaciones : [...(previas ?? []), ...datos.publicaciones]
        );
        setPaginado(datos.paginado);
      } catch (e) {
        setError(e.message);
        // Si falla cargar más, lo que ya estaba sigue en pantalla.
      } finally {
        setCargando(false);
        setCargandoMas(false);
        setRefrescando(false);
      }
    },
    []
  );

  useEffect(() => {
    buscar(criterios);
  }, [criterios, buscar]);

  function aplicarFiltros(nuevos) {
    setPanelAbierto(false);
    setCriterios({ ...criterios, ...nuevos });
  }

  function cambiarOrden(orden) {
    // Ordenar por cercanía sin coordenadas lo rechaza el backend, así que
    // ni se ofrece: el botón aparece sólo si hay de dónde medir.
    if (orden === criterios.orden) return;
    setCriterios({ ...criterios, orden });
  }

  const hayCoordenadas = Boolean(criterios.coordenadas);

  // Cambiar el orden o los filtros recarga la lista entera. Antes eso vaciaba
  // las publicaciones y se veian tres pantallas en menos de un segundo: la
  // lista, el estado "sin resultados" y el spinner de pantalla completa. Un
  // parpadeo feo por algo que tarda 200 ms.
  //
  // Ahora lo anterior se queda atenuado hasta que llega lo nuevo. Es el mismo
  // criterio que ya usabamos para el refresco que falla: nunca sacarle de la
  // pantalla algo util a alguien que no hizo nada malo.
  const recargando = cargando && !refrescando;

  // ---------------------------------------------------------------

  if (publicaciones === null) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.pantalla}>
      <Resumen criterios={criterios} etiquetas={etiquetas} total={paginado?.total} />

      <View style={styles.barra}>
        <TouchableOpacity
          style={styles.botonBarra}
          onPress={() => setPanelAbierto(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.textoBarra}>Ajustar</Text>
        </TouchableOpacity>

        <View style={styles.ordenes}>
          <TouchableOpacity
            style={[styles.orden, criterios.orden !== 'CERCANOS' ? styles.ordenActivo : null]}
            onPress={() => cambiarOrden('RECIENTES')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.textoOrden,
                criterios.orden !== 'CERCANOS' ? styles.textoOrdenActivo : null,
              ]}
            >
              Recientes
            </Text>
          </TouchableOpacity>

          {hayCoordenadas ? (
            <TouchableOpacity
              style={[styles.orden, criterios.orden === 'CERCANOS' ? styles.ordenActivo : null]}
              onPress={() => cambiarOrden('CERCANOS')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.textoOrden,
                  criterios.orden === 'CERCANOS' ? styles.textoOrdenActivo : null,
                ]}
              >
                Cercanos
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {error ? (
        <View style={styles.avisoError}>
          <Aviso mensaje={error} />
        </View>
      ) : null}

      <View
        style={[styles.contenedorLista, recargando ? styles.atenuado : null]}
        pointerEvents={recargando ? 'none' : 'auto'}
      >
      <FlatList
        data={publicaciones}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => {
              setRefrescando(true);
              buscar(criterios, { esRefresco: true });
            }}
            colors={[colors.primary]}
          />
        }
        // Paginado por scroll: se pide la siguiente cuando falta poco para
        // el final, así no hay que tocar ningún botón.
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (cargandoMas || !paginado?.hayMas) return;
          buscar(criterios, { pagina: paginado.pagina + 1 });
        }}
        ListFooterComponent={
          cargandoMas ? (
            <ActivityIndicator style={styles.pie} color={colors.primary} />
          ) : paginado && !paginado.hayMas && publicaciones.length > LIMITE && !recargando ? (
            // Sólo si hubo más de una página. "No hay más resultados" debajo de
            // un único resultado no informa nada: ya se ve que no hay más. El
            // cartel sirve cuando venís scrolleando y querés saber si llegaste
            // al final o todavía falta cargar.
            <Text style={styles.pieTexto}>No hay más resultados</Text>
          ) : null
        }
        ListEmptyComponent={
          <SinResultados
            criterios={criterios}
            onPublicar={() => navigation.navigate('Publicar')}
            onGuardarAlerta={() => navigation.navigate('MisAlertas')}
            onRefinar={() => setPanelAbierto(true)}
          />
        }
        renderItem={({ item }) => (
          <TarjetaResultado
            publicacion={item}
            onPress={() => navigation.navigate('DetallePublicacion', { id: item.id })}
          />
        )}
      />
      </View>

      <PanelFiltros
        visible={panelAbierto}
        criterios={criterios}
        categorias={categorias}
        barrios={barrios}
        onCerrar={() => setPanelAbierto(false)}
        onAplicar={aplicarFiltros}
      />
    </View>
  );
}

// ---------------------------------------------------------------

function Resumen({ criterios, etiquetas, total }) {
  // Se arma con lo que la persona eligió, no con los códigos internos.
  const partes = [];
  partes.push(criterios.queTePaso === 'PERDI' ? 'Lo que otros encontraron' : 'Lo que otros perdieron');
  if (etiquetas?.categoria) partes.push(etiquetas.categoria);
  if (criterios.q) partes.push(`"${criterios.q}"`);
  if (etiquetas?.barrio) partes.push(etiquetas.barrio);
  if (criterios.coordenadas) partes.push('cerca tuyo');

  return (
    <View style={styles.resumen}>
      <Text style={styles.resumenTexto}>{partes.join(' · ')}</Text>
      {total !== undefined ? (
        <Text style={styles.resumenTotal}>
          {total === 0 ? 'Sin resultados' : `${total} ${total === 1 ? 'resultado' : 'resultados'}`}
        </Text>
      ) : null}
    </View>
  );
}

// "Si no hay resultados, la app ofrece publicar la propia pérdida o hallazgo,
// o guardar la búsqueda como alerta."
function SinResultados({ criterios, onPublicar, onGuardarAlerta, onRefinar }) {
  return (
    <View style={styles.vacio}>
      <Text style={styles.vacioTitulo}>No encontramos nada</Text>
      <Text style={styles.vacioTexto}>
        {criterios.queTePaso === 'PERDI'
          ? 'Todavía nadie publicó algo parecido a lo que perdiste.'
          : 'Todavía nadie publicó que perdió algo parecido.'}
      </Text>

      <View style={styles.vacioBotones}>
        <Boton
          titulo={criterios.queTePaso === 'PERDI' ? 'Publicar lo que perdí' : 'Publicar lo que encontré'}
          onPress={onPublicar}
        />
        <Boton titulo="Avisarme si aparece" onPress={onGuardarAlerta} variante="secundario" />
        <TouchableOpacity style={styles.vacioEnlace} onPress={onRefinar}>
          <Text style={styles.enlace}>Probar con otros filtros</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// "Desde los resultados se pueden refinar los filtros sin volver al inicio."
//
// Es un modal y no otra pantalla: volver al buscador obligaría a rehacer las
// cuatro preguntas, que es exactamente lo que el enunciado quiere evitar.
function PanelFiltros({ visible, criterios, categorias, barrios, onCerrar, onAplicar }) {
  const [categoriaId, setCategoriaId] = useState(criterios.categoriaId);
  const [barrioId, setBarrioId] = useState(criterios.barrioId);
  const [q, setQ] = useState(criterios.q ?? '');
  const [cuando, setCuando] = useState(criterios.cuando ?? null);

  // Cada vez que se abre, el panel arranca mostrando lo que está aplicado.
  useEffect(() => {
    if (!visible) return;
    setCategoriaId(criterios.categoriaId);
    setBarrioId(criterios.barrioId);
    setQ(criterios.q ?? '');
    setCuando(criterios.cuando ?? null);
  }, [visible, criterios]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCerrar}>
      <View style={styles.modal}>
        <View style={styles.modalEncabezado}>
          <Text style={styles.modalTitulo}>Ajustar la búsqueda</Text>
          <TouchableOpacity onPress={onCerrar}>
            <Text style={styles.enlace}>Cerrar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalCuerpo} keyboardShouldPersistTaps="handled">
          <SelectorOpciones
            etiqueta="Categoría"
            opciones={categorias.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
            valor={categoriaId}
            onElegir={(v) => setCategoriaId(v === categoriaId ? null : v)}
          />

          <SelectorLista
            etiqueta="Barrio"
            placeholder="Cualquier barrio"
            tituloModal="¿En qué barrio?"
            opciones={barrios}
            valor={barrioId}
            onElegir={setBarrioId}
          />

          <CampoTexto
            etiqueta="Palabras clave"
            placeholder="mochila negra"
            value={q}
            onChangeText={setQ}
            maxLength={80}
            autoCapitalize="none"
          />

          <SelectorOpciones etiqueta="Fecha" opciones={CUANDO} valor={cuando} onElegir={setCuando} />
        </ScrollView>

        <View style={styles.modalPie}>
          <Boton
            titulo="Aplicar"
            onPress={() => onAplicar({ categoriaId, barrioId, q: q.trim(), cuando })}
          />
          <TouchableOpacity
            style={styles.limpiar}
            onPress={() => {
              setCategoriaId(null);
              setBarrioId(null);
              setQ('');
              setCuando(null);
            }}
          >
            <Text style={styles.enlace}>Limpiar filtros</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenedorLista: {
    flex: 1,
  },
  atenuado: {
    opacity: 0.35,
  },
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  resumen: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  resumenTexto: {
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  resumenTotal: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  botonBarra: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  textoBarra: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
  ordenes: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  orden: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ordenActivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  textoOrden: {
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  textoOrdenActivo: {
    color: colors.white,
    fontWeight: 'bold',
  },
  avisoError: {
    paddingHorizontal: spacing.lg,
  },
  lista: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
  },
  pie: {
    marginVertical: spacing.lg,
  },
  pieTexto: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    marginVertical: spacing.lg,
  },
  vacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  vacioTitulo: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  vacioTexto: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  vacioBotones: {
    width: '100%',
    gap: spacing.sm,
  },
  vacioEnlace: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  enlace: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.xl,
  },
  modalEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  modalTitulo: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalCuerpo: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  modalPie: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  limpiar: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
});
