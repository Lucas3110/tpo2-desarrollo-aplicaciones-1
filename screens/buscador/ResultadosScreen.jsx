// Punto 3 y Punto 6: la pantalla de resultados, con respaldo offline.
//
// "La pantalla de resultados es un listado paginado. [...] Desde los
// resultados se pueden refinar los filtros sin volver al inicio, y ordenarlos
// por más recientes o más cercanos. Si no hay resultados, la app ofrece
// publicar la propia pérdida o hallazgo, o guardar la búsqueda como alerta."
//
// Punto 6:
// - Usa `useFocusEffect` para cargar/refrescar al entrar o volver a la
//   pantalla.
// - Si no hay red, `buscarPublicaciones` lee los últimos resultados de
//   la caché local de publicaciones (`desdeCache: true`).
// - Un refresco fallido no borra lo que ya estaba en pantalla y muestra
//   `<Aviso tipo="info" />` advirtiendo que la información podría no estar
//   actualizada.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import { useNetworkState } from '../../hooks/useNetworkState';
import { TEXTOS } from '../../utils/mensajesConexion';
import {
  buscarPublicaciones,
  obtenerBarrios,
  obtenerCategorias,
} from '../../services/publicacionService';
import { crearAlerta } from '../../services/alertaService';
import { ubicacionActual } from '../../services/ubicacionService';
import { colors, fontSizes, radius, spacing } from '../../config/theme';

// Cuánto queda en pantalla el cartel de "guardamos la alerta".
const MS_AVISO_ALERTA = 3000;

const CUANDO = [
  { valor: null, etiqueta: 'Cualquier fecha' },
  { valor: 'HOY', etiqueta: 'Hoy' },
  { valor: 'TRES_DIAS', etiqueta: '3 días' },
  { valor: 'SEMANA', etiqueta: 'Semana' },
];

const LIMITE = 10;

export default function ResultadosScreen({ navigation, route }) {
  const { criterios: criteriosIniciales, etiquetas: etiquetasIniciales } = route.params;
  const { conectado, motivoOffline } = useNetworkState();

  const [criterios, setCriterios] = useState(criteriosIniciales);
  // Los nombres que se muestran en el resumen de arriba. Arrancan con lo que
  // se eligió en el buscador y se recalculan al ajustar desde acá: si no,
  // después de "Limpiar filtros" el encabezado seguía diciendo "Documentos ·
  // Avellaneda" sobre una lista que ya traía todo.
  const [etiquetas, setEtiquetas] = useState(etiquetasIniciales);
  // null = todavía no cargó nunca. [] = cargó y no hay resultados. Son dos
  // cosas distintas: la primera merece el spinner de pantalla completa, la
  // segunda el estado "sin resultados".
  const [publicaciones, setPublicaciones] = useState(null);
  const [paginado, setPaginado] = useState(null);
  const [desdeCache, setDesdeCache] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(null);

  // Punto 9: guardar la búsqueda como alerta. El aviso de confirmación es
  // de esta búsqueda: si se ajustan los filtros, ya es otra y se borra.
  const [guardandoAlerta, setGuardandoAlerta] = useState(false);
  const [pidiendoUbicacion, setPidiendoUbicacion] = useState(false);
  const [avisoAlerta, setAvisoAlerta] = useState(null);

  const [panelAbierto, setPanelAbierto] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [barrios, setBarrios] = useState([]);

  const yaCargo = useRef(false);

  const buscar = useCallback(
    async (criteriosNuevos, { pagina = 1, esRefresco = false } = {}) => {
      if (pagina === 1 && !esRefresco && !yaCargo.current) setCargando(true);
      if (pagina > 1) setCargandoMas(true);
      setError(null);

      try {
        const datos = await buscarPublicaciones({
          ...criteriosNuevos,
          pagina,
          limite: LIMITE,
        });

        // Si es un refresco manual o al volver a foco, ya teníamos resultados
        // en memoria y el servicio nos contestó desde caché porque se cortó
        // internet, conservamos la lista que ya estaba en pantalla y sólo
        // prendemos el aviso de desactualización.
        if (esRefresco && datos.desdeCache && yaCargo.current) {
          setDesdeCache(true);
          return;
        }

        // La primera página reemplaza; las siguientes se suman.
        setPublicaciones((previas) =>
          pagina === 1 ? datos.publicaciones : [...(previas ?? []), ...datos.publicaciones]
        );
        setPaginado(datos.paginado);
        setDesdeCache(Boolean(datos.desdeCache));
        yaCargo.current = true;
      } catch (e) {
        if (e.esDeConexion) {
          setDesdeCache(true);
        } else {
          setError(e.message);
        }
        // Si falla el refresco o cargar más, lo que ya estaba sigue en pantalla.
      } finally {
        setCargando(false);
        setCargandoMas(false);
        setRefrescando(false);
      }
    },
    []
  );

  // useFocusEffect y no useEffect: refresca datos al tomar foco y carga los
  // catálogos del panel de filtros.
  useFocusEffect(
    useCallback(() => {
      Promise.all([obtenerCategorias(), obtenerBarrios()])
        .then(([c, b]) => {
          setCategorias(c);
          setBarrios(b);
        })
        .catch(() => {
          // Si fallan, el panel queda sin listas pero los resultados se ven
          // igual. No vale cortar la pantalla por esto.
        });

      buscar(criterios, { esRefresco: yaCargo.current });
    }, [criterios, buscar])
  );

  // El aviso de la alerta se va solo. Es una confirmación de algo que ya
  // pasó, no un estado de la pantalla: dejarlo fijo arriba de los
  // resultados ocupa lugar para siempre por algo que se lee una vez.
  // Mismo criterio que el cartel de sesión vencida.
  useEffect(() => {
    if (avisoAlerta === null) return;
    const id = setTimeout(() => setAvisoAlerta(null), MS_AVISO_ALERTA);
    return () => clearTimeout(id);
  }, [avisoAlerta]);

  async function guardarAlerta() {
    if (!conectado) return;
    setGuardandoAlerta(true);
    setAvisoAlerta(null);
    try {
      const { creada } = await crearAlerta(criterios);
      setAvisoAlerta({
        tipo: creada ? 'exito' : 'info',
        mensaje: creada
          ? 'Listo, guardamos la alerta. En "Mis alertas" vas a ver lo que se publique de acá en adelante.'
          : 'Ya tenías esta búsqueda guardada como alerta.',
      });
    } catch (e) {
      setAvisoAlerta({ tipo: 'error', mensaje: e.message });
    } finally {
      setGuardandoAlerta(false);
    }
  }

  function aplicarFiltros(nuevos) {
    setPanelAbierto(false);
    setAvisoAlerta(null);
    setCriterios({ ...criterios, ...nuevos });
    setEtiquetas({
      categoria: nombreDe(categorias, nuevos.categoriaId, etiquetas?.categoria),
      barrio: nombreDe(barrios, nuevos.barrioId, etiquetas?.barrio),
    });
  }

  // Ordenar por cercanía necesita coordenadas. Si no las tenemos, se piden
  // acá mismo en vez de esconder el botón: el enunciado promete el orden y
  // la persona tiene que poder llegar a él desde los resultados.
  async function ordenarPorCercania() {
    if (criterios.orden === 'CERCANOS') return;

    if (criterios.coordenadas) {
      setCriterios({ ...criterios, orden: 'CERCANOS' });
      return;
    }

    setPidiendoUbicacion(true);
    setError(null);
    try {
      const punto = await ubicacionActual();
      setCriterios({ ...criterios, coordenadas: punto, orden: 'CERCANOS' });
    } catch (e) {
      // Negar el permiso no es un error de la app: se cuenta y se sigue con
      // el orden por fecha, que es el que ya estaba.
      setError(e.message);
    } finally {
      setPidiendoUbicacion(false);
    }
  }

  function cambiarOrden(orden) {
    // Ordenar por cercanía sin coordenadas lo rechaza el backend, así que
    // ni se ofrece: el botón aparece sólo si hay de dónde medir.
    if (orden === criterios.orden) return;
    setAvisoAlerta(null);
    setCriterios({ ...criterios, orden });
  }

  const hayCoordenadas = Boolean(criterios.coordenadas);
  const recargando = cargando && !refrescando;
  const mostrarAvisoDesactualizado = desdeCache || !conectado;

  // Con cero resultados la pantalla cambia bastante: no hay nada que
  // ordenar ni que ajustar desde la barra.
  const hayResultados = publicaciones !== null && publicaciones.length > 0;

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
      <Resumen
        criterios={criterios}
        etiquetas={etiquetas}
        total={paginado?.total}
        hayResultados={hayResultados}
        conectado={conectado}
        guardandoAlerta={guardandoAlerta}
        onGuardarAlerta={guardarAlerta}
      />

      {mostrarAvisoDesactualizado ? (
        <View style={styles.avisoAlerta}>
          <Aviso
            tipo="info"
            mensaje={TEXTOS.resultadosGuardados(motivoOffline)}
          />
        </View>
      ) : null}

      {avisoAlerta ? (
        <View style={styles.avisoAlerta}>
          <Aviso mensaje={avisoAlerta.mensaje} tipo={avisoAlerta.tipo} />
        </View>
      ) : null}

      {/* Sin resultados la barra no tiene sentido: no hay nada que ordenar y
          "Ajustar" sería el único botón de una fila entera. El estado vacío
          ya ofrece "Probar con otros filtros", que abre el mismo panel. */}
      {hayResultados ? (
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

          {/* "Cercanos" se muestra SIEMPRE. Antes aparecía sólo si habías
              compartido la ubicación, y desaparecer no se entiende: el
              enunciado promete ordenar "por más recientes o más cercanos" y
              la mitad de eso no estaba. Si no hay coordenadas, tocarlo las
              pide; si las negás, queda el aviso y seguís con Recientes. */}
          <TouchableOpacity
            style={[styles.orden, criterios.orden === 'CERCANOS' ? styles.ordenActivo : null]}
            onPress={ordenarPorCercania}
            disabled={pidiendoUbicacion}
            activeOpacity={0.7}
          >
            {pidiendoUbicacion ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text
                style={[
                  styles.textoOrden,
                  criterios.orden === 'CERCANOS' ? styles.textoOrdenActivo : null,
                ]}
              >
                Cercanos
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      ) : null}

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
            if (cargandoMas || !paginado?.hayMas || !conectado) return;
            buscar(criterios, { pagina: paginado.pagina + 1 });
          }}
          ListFooterComponent={
            cargandoMas ? (
              <ActivityIndicator style={styles.pie} color={colors.primary} />
            ) : paginado && !paginado.hayMas && publicaciones.length > LIMITE && !recargando ? (
              <Text style={styles.pieTexto}>No hay más resultados</Text>
            ) : null
          }
          ListEmptyComponent={
            <SinResultados
              criterios={criterios}
              conectado={conectado}
              onPublicar={() => navigation.navigate('Publicar')}
              guardandoAlerta={guardandoAlerta}
              onGuardarAlerta={guardarAlerta}
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

function nombreDe(opciones, id, anterior) {
  if (id === null || id === undefined) return null;
  return opciones.find((o) => o.id === id)?.nombre ?? anterior ?? null;
}

function Resumen({
  criterios,
  etiquetas,
  total,
  hayResultados,
  conectado,
  guardandoAlerta,
  onGuardarAlerta,
}) {
  // Se arma con lo que la persona eligió, no con los códigos internos.
  const partes = [];
  partes.push(
    criterios.queTePaso === 'PERDI' ? 'Lo que otros encontraron' : 'Lo que otros perdieron'
  );
  if (etiquetas?.categoria) partes.push(etiquetas.categoria);
  if (criterios.q) partes.push(`"${criterios.q}"`);
  if (etiquetas?.barrio) partes.push(etiquetas.barrio);
  if (criterios.coordenadas) partes.push('cerca tuyo');

  return (
    <View style={styles.resumen}>
      <View style={styles.resumenDatos}>
        <Text style={styles.resumenTexto}>{partes.join(' · ')}</Text>
        {/* El cero no se escribe: abajo ya dice "No encontramos nada", y
            leer las dos cosas una arriba de la otra sobra. */}
        {total ? (
          <Text style={styles.resumenTotal}>
            {`${total} ${total === 1 ? 'resultado' : 'resultados'}`}
          </Text>
        ) : null}
      </View>

      {/* "Cualquier búsqueda puede guardarse como alerta": también las que
          traen resultados, no sólo las vacías. Por eso el enlace vive acá.
          Pero cuando NO hay resultados se esconde: ahí abajo ya está
          "Avisarme si aparece", que hace exactamente lo mismo, y tener los
          dos botones a la vez confunde. Sin conexión queda deshabilitado
          (crear una alerta necesita el servidor). */}
      {hayResultados ? (
      <TouchableOpacity
        onPress={onGuardarAlerta}
        disabled={guardandoAlerta || !conectado}
        hitSlop={8}
        style={!conectado ? styles.atenuado : null}
      >
        {guardandoAlerta ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.enlace}>Guardar alerta</Text>
        )}
      </TouchableOpacity>
      ) : null}
    </View>
  );
}

function SinResultados({
  criterios,
  conectado,
  onPublicar,
  guardandoAlerta,
  onGuardarAlerta,
  onRefinar,
}) {
  const perdio = criterios.queTePaso === 'PERDI';

  return (
    <View style={styles.vacio}>
      <Text style={styles.vacioTitulo}>No encontramos coincidencias</Text>
      <Text style={styles.vacioTexto}>
        {perdio
          ? 'Todavía nadie publicó haber encontrado algo así. Podés publicar tu pérdida para que te encuentren, o guardar una alerta.'
          : 'Todavía nadie publicó haber perdido algo así. Publicá tu hallazgo para que su dueño pueda encontrarlo.'}
      </Text>

      <View style={styles.vacioBotones}>
        <Boton
          titulo={perdio ? 'Publicar lo que perdí' : 'Publicar lo que encontré'}
          onPress={onPublicar}
        />
        <Boton
          titulo="Avisarme si aparece"
          onPress={onGuardarAlerta}
          cargando={guardandoAlerta}
          deshabilitado={!conectado}
          variante="secundario"
        />
        <TouchableOpacity style={styles.vacioEnlace} onPress={onRefinar}>
          <Text style={styles.enlace}>Ajustar los filtros</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PanelFiltros({ visible, criterios, categorias, barrios, onCerrar, onAplicar }) {
  const [categoriaId, setCategoriaId] = useState(criterios.categoriaId);
  const [barrioId, setBarrioId] = useState(criterios.barrioId);
  const [q, setQ] = useState(criterios.q ?? '');
  const [cuando, setCuando] = useState(criterios.cuando);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCerrar}>
      <View style={styles.modal}>
        <View style={styles.modalEncabezado}>
          <Text style={styles.modalTitulo}>Ajustar búsqueda</Text>
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

          <SelectorOpciones
            etiqueta="Fecha"
            opciones={CUANDO}
            valor={cuando}
            onElegir={setCuando}
          />
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  resumenDatos: {
    flex: 1,
  },
  avisoAlerta: {
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
  // Bastante aire antes de los botones: pegado al texto parecía parte del
  // mismo bloque y se leía mal.
  vacioTexto: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl * 2,
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
