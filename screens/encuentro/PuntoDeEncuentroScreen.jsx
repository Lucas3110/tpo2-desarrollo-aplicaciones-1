// Punto 8: acordar el punto de encuentro después de aceptar un reclamo.
//
// "Quien tiene el objeto propone un punto de encuentro, y la otra parte
// puede aceptarlo o sugerir uno alternativo." "Cómo llegar" abre Maps con
// la dirección del encuentro, que puede diferir de la publicación.
//
// Los permisos vienen del backend para mantener una sola regla sobre quién
// puede actuar. La versión evita aceptar una propuesta que ya cambió en
// el otro teléfono. Aceptar el reclamo ya cerró el caso: esta pantalla sólo
// acuerda el lugar y no vuelve a confirmar la devolución.
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Boton from '../../components/Boton';
import CampoTexto from '../../components/CampoTexto';
import Aviso from '../../components/Aviso';
import { useNetworkState } from '../../hooks/useNetworkState';
import { TEXTOS } from '../../utils/mensajesConexion';
import {
  obtenerEncuentro,
  proponerEncuentro,
  aceptarEncuentro,
} from '../../services/encuentroService';
import {
  ubicacionActual,
  direccionDeCoordenadas,
  formatearCoordenadas,
} from '../../services/ubicacionService';
import { urlComoLlegar, urlMapsWeb } from '../../utils/mapas';
import { colors, spacing, fontSizes, radius } from '../../config/theme';

const DESINCRONIZADO = [
  'ENCUENTRO_CAMBIO',
  'ENCUENTRO_ACORDADO',
  'ENCUENTRO_ESPERA_RESPUESTA',
  'ENCUENTRO_INEXISTENTE',
];

export default function PuntoDeEncuentroScreen({ route, navigation }) {
  const reclamoId = route.params?.reclamoId;
  const { conectado, motivoOffline } = useNetworkState();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [sinConexion, setSinConexion] = useState(false);
  const [direccion, setDireccion] = useState('');
  const [coordenadas, setCoordenadas] = useState(null);
  const [alternativa, setAlternativa] = useState(false);
  const vigente = useRef(false);
  const operando = useRef(false);
  const lectura = useRef(0);

  const cargar = useCallback(async () => {
    const numero = ++lectura.current;
    setCargando(true);
    try {
      if (!Number.isInteger(Number(reclamoId)) || Number(reclamoId) <= 0)
        throw new Error('Abrí el encuentro desde un reclamo aceptado.');
      const resultado = await obtenerEncuentro(reclamoId);
      if (!vigente.current || numero !== lectura.current) return;
      setDatos(resultado);
      setSinConexion(false);
      setError(null);
      return true;
    } catch (e) {
      if (!vigente.current || numero !== lectura.current) return;
      setError(e.message);
      setSinConexion(Boolean(e.esDeConexion));
    } finally {
      if (vigente.current && numero === lectura.current) setCargando(false);
    }
  }, [reclamoId]);

  useFocusEffect(
    useCallback(() => {
      vigente.current = true;
      cargar();
      return () => {
        vigente.current = false;
        lectura.current += 1;
      };
    }, [cargar])
  );

  async function ejecutar(operacion) {
    if (operando.current) return;
    operando.current = true;
    lectura.current += 1;
    setCargando(false);
    setOcupado(true);
    setError(null);
    try {
      await operacion();
    } catch (e) {
      if (!vigente.current) return;
      // Una respuesta perdida puede haber guardado la propuesta. Nunca reenviamos
      // automáticamente: el usuario refresca para ver el estado del servidor.
      if (DESINCRONIZADO.includes(e.codigo)) {
        const actualizado = await cargar();
        // Si el refresco falla, conserva su aviso de conexión y las acciones
        // deshabilitadas: el conflicto original no significa que ya se actualizó.
        if (actualizado && vigente.current) setError(e.message);
        return;
      }
      setError(e.message);
      setSinConexion(Boolean(e.esDeConexion));
    } finally {
      operando.current = false;
      if (vigente.current) setOcupado(false);
    }
  }

  async function enviar() {
    if (!direccion.trim()) {
      setError('Escribí la dirección y la localidad del encuentro.');
      return;
    }
    await ejecutar(async () => {
      const resultado = await proponerEncuentro(reclamoId, {
        direccion: direccion.trim(),
        lat: coordenadas?.lat ?? null,
        lng: coordenadas?.lng ?? null,
        version: datos.encuentro?.version ?? 0,
      });
      if (!vigente.current) return;
      setDatos(resultado);
      setAlternativa(false);
      setDireccion('');
      setCoordenadas(null);
    });
  }

  function aceptar() {
    ejecutar(async () => {
      const resultado = await aceptarEncuentro(reclamoId, datos.encuentro.version);
      if (vigente.current) setDatos(resultado);
    });
  }

  function tomarUbicacion() {
    ejecutar(async () => {
      const punto = await ubicacionActual();
      const texto = await direccionDeCoordenadas(punto);
      if (!vigente.current) return;
      setCoordenadas(punto);
      setDireccion(texto ?? `Punto de encuentro (${formatearCoordenadas(punto)})`);
    });
  }

  function llegar() {
    ejecutar(async () => {
      try {
        await Linking.openURL(urlComoLlegar(datos.encuentro, Platform.OS));
      } catch {
        try {
          await Linking.openURL(urlMapsWeb(datos.encuentro));
        } catch {
          throw new Error('No se pudo abrir Maps. Podés copiar la dirección que aparece arriba.');
        }
      }
    });
  }

  if (!datos)
    return (
      <View style={styles.centro}>
        {cargando ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />
        ) : (
          <>
            <Aviso mensaje={error} />
            <Boton
              titulo="Reintentar"
              onPress={cargar}
            />
          </>
        )}
      </View>
    );

  const punto = datos.encuentro;
  // Sin conexión (la de la app, o porque falló la última carga) no se puede
  // proponer, aceptar ni sugerir: se deshabilita y se explica por qué.
  const inactivo = ocupado || cargando || sinConexion || !conectado;
  const formulario = datos.puedoProponer && (!punto || alternativa);
  const estado = !punto
    ? 'Falta proponer un lugar'
    : datos.acordado
      ? 'Punto de encuentro acordado'
      : 'Propuesta pendiente';
  return (
    <ScrollView
      style={styles.pantalla}
      contentContainerStyle={styles.contenido}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={cargando}
          onRefresh={cargar}
          enabled={!ocupado}
        />
      }
    >
      <Text style={styles.titulo}>{datos.publicacion.titulo}</Text>
      <Text style={styles.estado}>{estado}</Text>
      <Aviso mensaje={error} />
      {sinConexion || !conectado ? (
        <Aviso
          tipo="info"
          mensaje={`${TEXTOS.necesitaConexion(motivoOffline, 'coordinar el encuentro')} Conservamos lo último que cargó; tocá Actualizar para reintentar.`}
        />
      ) : null}
      <Boton
        titulo="Actualizar"
        onPress={cargar}
        cargando={cargando}
        deshabilitado={ocupado}
        variante="secundario"
      />

      {punto ? (
        <View style={styles.tarjeta}>
          <Text style={styles.subtitulo}>Lugar del encuentro</Text>
          <Text
            selectable
            style={styles.texto}
          >
            {punto.direccion}
          </Text>
          {punto.lat !== null ? (
            <Text
              selectable
              style={styles.nota}
            >
              {formatearCoordenadas(punto)}
            </Text>
          ) : null}
          <Boton
            titulo="Cómo llegar"
            onPress={llegar}
            deshabilitado={ocupado}
            variante="secundario"
          />
          {punto.estado === 'PROPUESTO' ? (
            <Text style={styles.nota}>
              {punto.propuestoPorMi
                ? 'La otra persona debe aceptar tu propuesta o sugerir otro lugar.'
                : 'Podés aceptar este lugar o sugerir una alternativa.'}
            </Text>
          ) : null}
        </View>
      ) : null}

      {!punto && !datos.puedoProponer ? (
        <Aviso
          tipo="info"
          mensaje="Quien tiene el objeto debe proponer el primer punto de encuentro. Volvé a actualizar para ver su propuesta."
        />
      ) : null}

      {datos.puedoAceptar && !alternativa ? (
        <View style={styles.tarjeta}>
          <Boton
            titulo="Aceptar este lugar"
            onPress={aceptar}
            deshabilitado={inactivo}
          />
          <Boton
            titulo="Sugerir otro lugar"
            onPress={() => setAlternativa(true)}
            deshabilitado={inactivo}
            variante="secundario"
          />
        </View>
      ) : null}

      {formulario ? (
        <View style={styles.tarjeta}>
          <Text style={styles.subtitulo}>
            {punto ? 'Tu alternativa' : 'Proponé un punto de encuentro'}
          </Text>
          <Text style={styles.nota}>
            Elegí un lugar fácil de reconocer. Incluí calle, altura y localidad.
          </Text>
          <CampoTexto
            etiqueta="Dirección del encuentro"
            value={direccion}
            maxLength={255}
            editable={!ocupado}
            placeholder="Av. Santa Fe 3253, CABA"
            onChangeText={(texto) => {
              setDireccion(texto);
              setCoordenadas(null);
            }}
          />
          {coordenadas ? (
            <Text style={styles.nota}>
              Ubicación adjunta: {formatearCoordenadas(coordenadas)}. Si editás la dirección se
              usará el texto para navegar.
            </Text>
          ) : null}
          <Boton
            titulo="Usar mi ubicación actual"
            onPress={tomarUbicacion}
            deshabilitado={inactivo}
            variante="secundario"
          />
          <Boton
            titulo={punto ? 'Enviar alternativa' : 'Enviar propuesta'}
            onPress={enviar}
            deshabilitado={inactivo}
            cargando={ocupado}
          />
          {punto ? (
            <Boton
              titulo="Cancelar"
              onPress={() => setAlternativa(false)}
              deshabilitado={ocupado}
              variante="secundario"
            />
          ) : null}
        </View>
      ) : null}

      {datos.acordado ? (
        <View style={styles.tarjeta}>
          <Aviso
            tipo="exito"
            mensaje="Listo, el lugar quedó acordado. Cuando se encuentren, podés valorar a la otra persona desde tu historial."
          />
          <Boton
            titulo="Ver historial"
            onPress={() => navigation.navigate('Historial')}
            variante="secundario"
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.background },
  contenido: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  centro: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  titulo: { fontSize: fontSizes.xl, fontWeight: 'bold', color: colors.text },
  estado: { fontSize: fontSizes.md, fontWeight: 'bold', color: colors.primary },
  tarjeta: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subtitulo: { fontSize: fontSizes.lg, fontWeight: 'bold', color: colors.text },
  texto: { fontSize: fontSizes.md, lineHeight: 24, color: colors.text },
  nota: { fontSize: fontSizes.sm, lineHeight: 21, color: colors.textSecondary },
});
