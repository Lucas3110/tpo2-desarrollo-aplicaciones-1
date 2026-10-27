// Punto 7: un reclamo completo, y la respuesta del publicador.
//
// "El publicador puede aceptar o rechazar cada reclamo." Para decidir
// necesita ver lo que mandó la otra persona: qué contestó a la pregunta de
// verificación (y si coincidió), la descripción, la foto y, en "Lo
// encontré", el barrio. Por eso esta pantalla muestra todo eso y recién
// abajo los dos botones.
//
// Quien reclamó ve lo mismo, sin botones, con el estado y lo que sigue:
// si lo aceptaron, que ya puede ver la dirección exacta en la publicación.
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Aviso from '../../components/Aviso';
import Boton from '../../components/Boton';
import CampoTexto from '../../components/CampoTexto';
import { urlDeFoto } from '../../services/publicacionService';
import { aceptarReclamo, obtenerReclamo, rechazarReclamo } from '../../services/reclamoService';
import { isoATexto } from '../../utils/fechas';
import {
  describirEstadoReclamo,
  describirTipoReclamo,
  describirVencimiento,
} from '../../utils/reclamos';
import { colors, fontSizes, radius, spacing } from '../../config/theme';

const MOTIVO_MAX = 300;

export default function DetalleReclamoScreen({ navigation, route }) {
  const { id } = route.params;

  const [reclamo, setReclamo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const yaCargo = useRef(false);

  // Rechazar pide un motivo opcional: se despliega el campo en vez de abrir
  // otra pantalla por una línea de texto.
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(null); // 'aceptar' | 'rechazar'

  async function cargar() {
    if (!yaCargo.current) setCargando(true);
    setError(null);
    try {
      setReclamo(await obtenerReclamo(id));
      yaCargo.current = true;
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [id])
  );

  function confirmarAceptar() {
    // Aceptar cierra el caso y le muestra la dirección exacta a la otra
    // persona: no se puede deshacer, así que se pregunta.
    Alert.alert(
      'Aceptar el reclamo',
      `${reclamo.reclamante.nombre} va a poder ver la dirección exacta de la publicación y los demás reclamos pendientes se van a rechazar. ¿Confirmás?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Aceptar', onPress: aceptar },
      ]
    );
  }

  async function aceptar() {
    setEnviando('aceptar');
    setError(null);
    try {
      setReclamo(await aceptarReclamo(id));
      setAviso('Reclamo aceptado. Ahora pueden coordinar la devolución.');
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(null);
    }
  }

  async function rechazar() {
    if (motivo.length > MOTIVO_MAX) {
      setError(`El motivo puede tener hasta ${MOTIVO_MAX} caracteres`);
      return;
    }
    setEnviando('rechazar');
    setError(null);
    try {
      setReclamo(await rechazarReclamo(id, motivo.trim() || null));
      setRechazando(false);
      setAviso('Reclamo rechazado. Si no queda otro pendiente, la publicación vuelve a estar abierta.');
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(null);
    }
  }

  // ---------------------------------------------------------------

  if (cargando && reclamo === null) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (reclamo === null) {
    return (
      <View style={styles.centrado}>
        <Aviso mensaje={error} />
        <Boton titulo="Reintentar" onPress={cargar} />
      </View>
    );
  }

  const estado = describirEstadoReclamo(reclamo.estado);
  const { publicacion } = reclamo;

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      {aviso ? <Aviso mensaje={aviso} tipo="exito" /> : null}
      <Aviso mensaje={error} />

      {/* Sobre qué publicación es. */}
      <TouchableOpacity
        style={styles.publicacion}
        onPress={() => navigation.navigate('DetallePublicacion', { id: publicacion.id })}
        activeOpacity={0.8}
      >
        {publicacion.portada ? (
          <Image source={{ uri: urlDeFoto(publicacion.portada) }} style={styles.miniatura} />
        ) : (
          <View style={[styles.miniatura, styles.sinFoto]}>
            <Text style={styles.sinFotoTexto}>Sin{'\n'}foto</Text>
          </View>
        )}
        <View style={styles.publicacionDatos}>
          <Text style={styles.tipo}>{describirTipoReclamo(reclamo.tipo)}</Text>
          <Text style={styles.titulo} numberOfLines={2}>
            {publicacion.titulo}
          </Text>
          <Text style={styles.enlace}>Ver la publicación</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.encabezado}>
        <View style={[styles.chip, { backgroundColor: estado.color }]}>
          <Text style={styles.chipTexto}>{estado.texto}</Text>
        </View>
        <Text style={styles.nota}>{describirFechas(reclamo)}</Text>
      </View>

      <Seccion titulo={reclamo.soyElPublicador ? 'Quién reclama' : 'A quién le reclamaste'}>
        <Text style={styles.texto}>
          {reclamo.soyElPublicador ? reclamo.reclamante.nombre : reclamo.publicador.nombre}
        </Text>
      </Seccion>

      {reclamo.tipo === 'ES_MIO' ? (
        <Seccion titulo="Respuesta a la pregunta de verificación">
          <Text style={styles.texto}>"{reclamo.respuesta}"</Text>
          <Text style={[styles.nota, reclamo.respuestaCorrecta ? styles.bien : null]}>
            {reclamo.respuestaCorrecta ? 'Coincide con la respuesta del publicador.' : 'No coincide.'}
          </Text>
        </Seccion>
      ) : (
        <Seccion titulo="Dónde lo encontró">
          <Text style={styles.texto}>{reclamo.barrio?.nombre ?? 'Sin barrio'}</Text>
        </Seccion>
      )}

      {reclamo.descripcion ? (
        <Seccion titulo="Descripción">
          <Text style={styles.texto}>{reclamo.descripcion}</Text>
        </Seccion>
      ) : null}

      {reclamo.fotoUrl ? (
        <Seccion titulo={reclamo.tipo === 'ES_MIO' ? 'Foto que acredita' : 'Foto de lo que encontró'}>
          <Image source={{ uri: urlDeFoto(reclamo.fotoUrl) }} style={styles.foto} resizeMode="cover" />
        </Seccion>
      ) : null}

      {reclamo.estado === 'RECHAZADO' && reclamo.motivo ? (
        <Seccion titulo="Motivo del rechazo">
          <Text style={styles.texto}>{reclamo.motivo}</Text>
        </Seccion>
      ) : null}

      {/* Lo que sigue, según de qué lado se esté. */}
      {reclamo.esperaMiRespuesta ? (
        <View style={styles.respuesta}>
          <Text style={styles.seccionTitulo}>Tu respuesta</Text>

          {rechazando ? (
            <>
              <CampoTexto
                etiqueta="Motivo (opcional)"
                placeholder="La foto no coincide con lo que encontré"
                value={motivo}
                onChangeText={setMotivo}
                maxLength={MOTIVO_MAX}
                ayuda="La otra persona lo va a leer."
              />
              <Boton
                titulo="Confirmar rechazo"
                onPress={rechazar}
                cargando={enviando === 'rechazar'}
                deshabilitado={enviando !== null}
              />
              <TouchableOpacity style={styles.volver} onPress={() => setRechazando(false)} disabled={enviando !== null}>
                <Text style={styles.enlace}>Cancelar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.botones}>
              <Boton
                titulo="Aceptar"
                onPress={confirmarAceptar}
                cargando={enviando === 'aceptar'}
                deshabilitado={enviando !== null}
              />
              <Boton
                titulo="Rechazar"
                onPress={() => setRechazando(true)}
                deshabilitado={enviando !== null}
                variante="secundario"
              />
              <Text style={styles.nota}>
                Si aceptás, {reclamo.reclamante.nombre} va a ver la dirección exacta y la publicación queda resuelta.
              </Text>
            </View>
          )}
        </View>
      ) : reclamo.estado === 'ACEPTADO' ? (
        <View style={styles.respuesta}>
          <Text style={styles.texto}>
            {reclamo.soyElReclamante
              ? 'Aceptaron tu reclamo. Ya podés ver la dirección exacta en la publicación para coordinar la devolución.'
              : 'Aceptaste este reclamo. La publicación quedó resuelta.'}
          </Text>
          <View style={styles.botones}>
            <Boton
              titulo="Ver la publicación"
              onPress={() => navigation.navigate('DetallePublicacion', { id: publicacion.id })}
              variante="secundario"
            />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

// ---------------------------------------------------------------

function describirFechas(reclamo) {
  const enviado = `Enviado el ${isoATexto(String(reclamo.creadoEn).slice(0, 10))}`;
  if (reclamo.estado === 'PENDIENTE') return `${enviado} · ${describirVencimiento(reclamo.horasParaVencer)}`;
  if (reclamo.respondidoEn) {
    return `${enviado} · Respondido el ${isoATexto(String(reclamo.respondidoEn).slice(0, 10))}`;
  }
  return enviado;
}

function Seccion({ titulo, children }) {
  return (
    <View style={styles.seccion}>
      <Text style={styles.seccionTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

const ANCHO_FOTO = Dimensions.get('window').width - spacing.lg * 2;

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contenido: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  publicacion: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  miniatura: {
    width: 72,
    height: 72,
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
  publicacionDatos: {
    flex: 1,
  },
  tipo: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titulo: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
    marginVertical: 2,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  chip: {
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  chipTexto: {
    color: colors.white,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
  },
  seccion: {
    marginTop: spacing.lg,
  },
  seccionTitulo: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  texto: {
    fontSize: fontSizes.md,
    color: colors.text,
    lineHeight: 22,
  },
  nota: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 18,
    flexShrink: 1,
  },
  bien: {
    color: colors.success,
    fontWeight: 'bold',
  },
  foto: {
    width: ANCHO_FOTO,
    height: ANCHO_FOTO * 0.75,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  respuesta: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  botones: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  volver: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  enlace: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
});
