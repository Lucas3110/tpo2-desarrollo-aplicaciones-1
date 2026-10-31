// Punto 2: el perfil propio.
//
// "Ver y editar los datos personales: nombre, foto de perfil, barrio y
// teléfono de contacto." Los datos salen del AuthContext y no del backend,
// así la pantalla tiene algo que mostrar desde el primer render, sin
// spinner.
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Avatar from '../../components/Avatar';
import Boton from '../../components/Boton';
import { useAuth } from '../../hooks/useAuth';
import { colors, fontSizes, radius, spacing } from '../../config/theme';

function Dato({ etiqueta, valor }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Text style={valor ? styles.valor : styles.valorVacio}>{valor || 'Sin cargar'}</Text>
    </View>
  );
}

export default function PerfilScreen({ navigation }) {
  const { usuario } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <View style={styles.cabecera}>
        <Avatar nombre={usuario?.nombre} fotoUrl={usuario?.fotoUrl} />
        <Text style={styles.nombre}>{usuario?.nombre}</Text>
        <Text style={styles.email}>{usuario?.email}</Text>
      </View>

      <Text style={styles.seccion}>Datos personales</Text>
      <View style={styles.tarjeta}>
        <Dato etiqueta="Nombre" valor={usuario?.nombre} />
        <Dato etiqueta="Barrio" valor={usuario?.zona?.nombre} />
        <Dato etiqueta="Teléfono" valor={usuario?.telefono} />
        <View style={styles.editar}>
          <Boton
            titulo="Editar mis datos"
            onPress={() => navigation.navigate('EditarPerfil')}
            variante="secundario"
          />
        </View>
      </View>

      <Text style={styles.seccion}>Privacidad</Text>
      <View style={styles.tarjeta}>
        <Text style={styles.pendiente}>
          Acá vas a poder elegir si tu teléfono se muestra cuando aceptás un reclamo.
        </Text>
      </View>

      <Text style={styles.seccion}>Reputación</Text>
      <View style={styles.tarjeta}>
        <Text style={styles.pendiente}>Acá van a aparecer tus devoluciones, valoraciones e insignias.</Text>
      </View>

      <TouchableOpacity
        style={styles.enlace}
        onPress={() => navigation.navigate('PerfilPublico', { id: usuario?.id })}
        activeOpacity={0.7}
      >
        <Text style={styles.textoEnlace}>Ver cómo me ven los demás</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  email: {
    fontSize: fontSizes.sm,
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
  dato: {
    paddingVertical: spacing.xs,
  },
  etiqueta: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  valor: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  valorVacio: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  editar: {
    marginTop: spacing.md,
  },
  pendiente: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  enlace: {
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  textoEnlace: {
    fontSize: fontSizes.md,
    color: colors.secondary,
    fontWeight: 'bold',
  },
});
