// Punto 10: 'Historial de casos resueltos, separado en "Devolví" y
// "Recuperé", con fecha, objeto y contraparte. Filtro por rango de fechas y
// por tipo.'
//
// El tipo son las dos solapas. El rango de fechas son atajos (última semana,
// último mes) y, si hace falta, un rango escrito a mano: la mayoría de las
// veces alcanza con un atajo, y escribir dos fechas para ver lo del último
// mes es un trámite.
//
// Qué es un caso lo decide el backend: un reclamo aceptado. La app recibe
// de cada uno de qué lado estuvo, y lo pinta.
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Aviso from '../../components/Aviso';
import Boton from '../../components/Boton';
import CampoTexto from '../../components/CampoTexto';
import SelectorOpciones from '../../components/SelectorOpciones';
import { obtenerHistorial } from '../../services/historialService';
import { urlDeFoto } from '../../services/publicacionService';
import { hoyIso, isoATexto, isoDeHace, textoAIso } from '../../utils/fechas';
import { colors, fontSizes, radius, spacing } from '../../config/theme';

const PERIODOS = [
  { valor: 'TODO', etiqueta: 'Todo' },
  { valor: 'SEMANA', etiqueta: 'Última semana' },
  { valor: 'MES', etiqueta: 'Último mes' },
  { valor: 'RANGO', etiqueta: 'Un rango' },
];

// Las fechas que corresponden a cada atajo. RANGO usa lo que se escribió.
function fechasDe(periodo, rango) {
  if (periodo === 'SEMANA') return { desde: isoDeHace(7), hasta: hoyIso() };
  if (periodo === 'MES') return { desde: isoDeHace(30), hasta: hoyIso() };
  if (periodo === 'RANGO') return rango;
  return { desde: null, hasta: null };
}

export default function HistorialScreen({ navigation }) {
  // { casos, resumen }. null hasta la primera carga.
  const [datos, setDatos] = useState(null);
  const [rol, setRol] = useState('DEVOLVI');
  const [periodo, setPeriodo] = useState('TODO');

  // El rango escrito se aplica con un botón, no en cada tecla: si no, cada
  // dígito dispararía un pedido con una fecha a medio escribir.
  const [desdeTexto, setDesdeTexto] = useState(isoATexto(isoDeHace(30)));
  const [hastaTexto, setHastaTexto] = useState(isoATexto(hoyIso()));
  const [rango, setRango] = useState({ desde: null, hasta: null });
  const [errores, setErrores] = useState({});

  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(null);
  const yaCargo = useRef(false);

  async function cargar({ esRefresco = false } = {}) {
    if (!yaCargo.current && !esRefresco) setCargando(true);
    setError(null);
    try {
      setDatos(await obtenerHistorial({ tipo: rol, ...fechasDe(periodo, rango) }));
      yaCargo.current = true;
    } catch (e) {
      // Lo que ya estaba sigue en pantalla; el aviso va arriba.
      setError(e.message);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }

  // Se recarga al volver (por ejemplo, después de valorar) y cada vez que
  // cambia un filtro. Un rango se "aplica" cambiando `rango`, que está acá.
  useFocusEffect(
    useCallback(() => {
      if (periodo === 'RANGO' && rango.desde === null) return;
      cargar();
    }, [rol, periodo, rango])
  );

  function aplicarRango() {
    const desde = textoAIso(desdeTexto);
    const hasta = textoAIso(hastaTexto);
    const malos = {};
    if (desde === null) malos.desde = 'Escribila como DD/MM/AAAA';
    if (hasta === null) malos.hasta = 'Escribila como DD/MM/AAAA';
    if (desde && hasta && desde > hasta) malos.hasta = 'Tiene que ser posterior a la primera';
    setErrores(malos);
    if (Object.keys(malos).length > 0) return;
    setRango({ desde, hasta });
  }

  function cambiarPeriodo(valor) {
    setPeriodo(valor);
    setErrores({});
    // Al salir del rango se vuelve a pedir sin fechas; al entrar se espera
    // a que se aplique uno.
    if (valor !== 'RANGO') setRango({ desde: null, hasta: null });
  }

  if (cargando && datos === null) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (datos === null) {
    return (
      <View style={styles.centrado}>
        <Aviso mensaje={error} />
        <Boton titulo="Reintentar" onPress={() => cargar()} />
      </View>
    );
  }

  return (
    <View style={styles.pantalla}>
      <View style={styles.solapas}>
        <Solapa
          titulo="Devolví"
          cantidad={datos.resumen.devolvi}
          activa={rol === 'DEVOLVI'}
          onPress={() => setRol('DEVOLVI')}
        />
        <Solapa
          titulo="Recuperé"
          cantidad={datos.resumen.recupere}
          activa={rol === 'RECUPERE'}
          onPress={() => setRol('RECUPERE')}
        />
      </View>

      <FlatList
        data={datos.casos}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.lista}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.filtros}>
            <SelectorOpciones opciones={PERIODOS} valor={periodo} onElegir={cambiarPeriodo} />

            {periodo === 'RANGO' ? (
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
                <Boton titulo="Aplicar" onPress={aplicarRango} variante="secundario" />
              </View>
            ) : null}

            {error ? <Aviso mensaje={error} /> : null}
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => {
              setRefrescando(true);
              cargar({ esRefresco: true });
            }}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.vacioTitulo}>
              {periodo === 'TODO'
                ? rol === 'DEVOLVI'
                  ? 'Todavía no devolviste nada'
                  : 'Todavía no recuperaste nada'
                : 'Nada en ese período'}
            </Text>
            <Text style={styles.vacioTexto}>
              {rol === 'DEVOLVI'
                ? 'Cuando aceptes un "Es mío" sobre algo que encontraste, o te acepten un "Lo encontré", aparece acá.'
                : 'Cuando te acepten un "Es mío", o aceptes un "Lo encontré" sobre algo que perdiste, aparece acá.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TarjetaCaso
            caso={item}
            onPress={() => navigation.navigate('DetallePublicacion', { id: item.publicacion.id })}
            onValorar={() =>
              navigation.navigate('Valorar', {
                casoId: item.id,
                contraparte: item.contraparte,
                titulo: item.publicacion.titulo,
                puedoAgradecer: item.valoracion.puedoAgradecer,
              })
            }
          />
        )}
      />
    </View>
  );
}

// ---------------------------------------------------------------

function Solapa({ titulo, cantidad, activa, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.solapa, activa ? styles.solapaActiva : null]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.solapaTexto, activa ? styles.solapaTextoActiva : null]}>
        {titulo} ({cantidad})
      </Text>
    </TouchableOpacity>
  );
}

// "Con fecha, objeto y contraparte", más cómo quedó la valoración y, si
// todavía se está a tiempo, el botón para dejarla.
function TarjetaCaso({ caso, onPress, onValorar }) {
  const { publicacion, contraparte, valoracion } = caso;

  return (
    <TouchableOpacity style={styles.tarjeta} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.fila}>
        {publicacion.portada ? (
          <Image source={{ uri: urlDeFoto(publicacion.portada) }} style={styles.miniatura} />
        ) : (
          <View style={[styles.miniatura, styles.sinFoto]}>
            <Text style={styles.sinFotoTexto}>Sin{'\n'}foto</Text>
          </View>
        )}

        <View style={styles.datos}>
          <Text style={styles.fecha}>{isoATexto(String(caso.fecha).slice(0, 10))}</Text>
          <Text style={styles.titulo} numberOfLines={2}>
            {publicacion.titulo}
          </Text>
          <Text style={styles.detalle}>
            {caso.rol === 'DEVOLVI'
              ? `Se lo devolviste a ${contraparte.nombre}`
              : `Te lo devolvió ${contraparte.nombre}`}
          </Text>
        </View>
      </View>

      <View style={styles.valoraciones}>
        <Text style={styles.detalle}>
          {valoracion.mia
            ? `Valoraste: ${describirValoracion(valoracion.mia)}`
            : valoracion.puedoValorar
              ? `Todavía no valoraste a ${contraparte.nombre}. Te ${valoracion.diasParaValorar === 1 ? 'queda 1 día' : `quedan ${valoracion.diasParaValorar} días`}.`
              : 'Ya pasaron los 7 días para valorar.'}
        </Text>
        <Text style={styles.detalle}>
          {valoracion.recibida
            ? `${contraparte.nombre} te valoró: ${describirValoracion(valoracion.recibida)}`
            : `${contraparte.nombre} todavía no te valoró.`}
        </Text>
        {valoracion.recibida?.agradecimiento ? (
          <Text style={styles.agradecimiento}>"{valoracion.recibida.agradecimiento}"</Text>
        ) : null}

        {valoracion.puedoValorar ? (
          <TouchableOpacity style={styles.valorar} onPress={onValorar} activeOpacity={0.7}>
            <Text style={styles.valorarTexto}>Valorar a {contraparte.nombre}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function describirValoracion(valoracion) {
  const tipo = valoracion.tipo === 'POSITIVA' ? 'positiva' : 'negativa';
  return valoracion.mensaje ? `${tipo} · "${valoracion.mensaje}"` : tipo;
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  solapas: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  solapa: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  solapaActiva: {
    borderBottomColor: colors.primary,
  },
  solapaTexto: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  solapaTextoActiva: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  filtros: {
    paddingTop: spacing.md,
  },
  rango: {
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    paddingLeft: spacing.md,
    marginBottom: spacing.md,
  },
  lista: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
  },
  tarjeta: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  fila: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  miniatura: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  sinFoto: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sinFotoTexto: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  datos: {
    flex: 1,
  },
  fecha: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titulo: {
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  detalle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  valoraciones: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  agradecimiento: {
    fontSize: fontSizes.sm,
    color: colors.text,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  valorar: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  valorarTexto: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
  vacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  vacioTitulo: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  vacioTexto: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
