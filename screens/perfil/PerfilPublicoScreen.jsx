// Punto 2: el perfil público de una persona.
//
// "El perfil público muestra la reputación, las insignias y la antigüedad
// en la plataforma, pero no el teléfono ni el historial de publicaciones."
// Se llega desde el detalle de una publicación (punto 4), para decidir si
// confiar en quien publicó, y desde el perfil propio ("Ver cómo me ven los
// demás").
//
// Suma los agradecimientos públicos del punto 10: "visible en el perfil de
// quien se lo devolvió".
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Aviso from '../../components/Aviso';
import Avatar from '../../components/Avatar';
import Boton from '../../components/Boton';
import ReputacionPerfil from '../../components/ReputacionPerfil';
import { obtenerAgradecimientos, obtenerPerfilPublico } from '../../services/perfilService';
import { describirAntiguedad, isoATexto, mesYAnio } from '../../utils/fechas';
import { colors, fontSizes, radius, spacing } from '../../config/theme';

export default function PerfilPublicoScreen({ route }) {
  const { id } = route.params;

  const [perfil, setPerfil] = useState(null);
  const [agradecimientos, setAgradecimientos] = useState([]);
  const [error, setError] = useState(null);

  async function cargar() {
    setError(null);
    try {
      // No dependen uno del otro: van juntos.
      const [datos, gracias] = await Promise.all([
        obtenerPerfilPublico(id),
        obtenerAgradecimientos(id),
      ]);
      setPerfil(datos);
      setAgradecimientos(gracias);
    } catch (e) {
      setError(e.message);
    }
  }

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [id])
  );

  if (perfil === null) {
    return (
      <View style={styles.centrado}>
        {error ? (
          <>
            <Aviso mensaje={error} />
            <Boton titulo="Reintentar" onPress={cargar} />
          </>
        ) : (
          <ActivityIndicator size="large" color={colors.primary} />
        )}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <View style={styles.cabecera}>
        <Avatar nombre={perfil.nombre} fotoUrl={perfil.fotoUrl} />
        <Text style={styles.nombre}>{perfil.nombre}</Text>
        <Text style={styles.antiguedad}>
          En Hallado hace {describirAntiguedad(perfil.antiguedadDias)}
        </Text>
        <Text style={styles.desde}>Miembro desde {mesYAnio(perfil.miembroDesde)}</Text>
      </View>

      <Text style={styles.seccion}>Reputación</Text>
      <View style={styles.tarjeta}>
        <ReputacionPerfil reputacion={perfil.reputacion} insignias={perfil.insignias} />
      </View>

      <Text style={styles.seccion}>Agradecimientos</Text>
      {agradecimientos.length === 0 ? (
        <View style={styles.tarjeta}>
          <Text style={styles.vacio}>Todavía nadie le dejó un agradecimiento.</Text>
        </View>
      ) : (
        agradecimientos.map((a) => (
          <View key={a.id} style={[styles.tarjeta, styles.agradecimiento]}>
            <Text style={styles.texto}>"{a.texto}"</Text>
            <Text style={styles.firma}>
              {a.de.nombre} · {a.publicacion.titulo} · {isoATexto(String(a.fecha).slice(0, 10))}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  contenido: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  cabecera: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  nombre: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.sm,
  },
  antiguedad: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  desde: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  seccion: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  tarjeta: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  agradecimiento: {
    marginBottom: spacing.sm,
  },
  texto: {
    fontSize: fontSizes.md,
    color: colors.text,
    fontStyle: 'italic',
  },
  firma: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  vacio: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
});
