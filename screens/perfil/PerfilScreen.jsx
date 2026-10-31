// Punto 2: el perfil propio.
//
// "Ver y editar los datos personales: nombre, foto de perfil, barrio y
// teléfono de contacto." Los datos salen del AuthContext y no del backend,
// así la pantalla tiene algo que mostrar desde el primer render, sin
// spinner.
//
// "La persona decide si su teléfono es visible para la otra parte una vez
// aceptado un reclamo, o si prefiere comunicarse solo a través de la app."
// Eso es el switch de Privacidad: se guarda apenas se toca, como cualquier
// ajuste de Android, sin botón de "Guardar".
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Aviso from '../../components/Aviso';
import Avatar from '../../components/Avatar';
import Boton from '../../components/Boton';
import { useAuth } from '../../hooks/useAuth';
import { actualizarMisDatos, datosDe } from '../../services/perfilService';
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
  const { usuario, actualizarUsuario } = useAuth();

  const [guardandoPrivacidad, setGuardandoPrivacidad] = useState(false);
  const [errorPrivacidad, setErrorPrivacidad] = useState(null);

  async function cambiarVisibilidad(visible) {
    setErrorPrivacidad(null);
    setGuardandoPrivacidad(true);
    try {
      const actualizado = await actualizarMisDatos({ ...datosDe(usuario), telefonoVisible: visible });
      await actualizarUsuario(actualizado);
    } catch (e) {
      // El switch no se movió: su valor sale del usuario de la sesión, que
      // no cambió. Sólo queda contar por qué.
      setErrorPrivacidad(e.message);
    } finally {
      setGuardandoPrivacidad(false);
    }
  }

  const tieneTelefono = Boolean(usuario?.telefono);

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
      <Aviso mensaje={errorPrivacidad} />
      <View style={styles.tarjeta}>
        <View style={styles.fila}>
          <View style={styles.filaTexto}>
            <Text style={styles.valor}>Mostrar mi teléfono</Text>
            <Text style={styles.explicacion}>
              {!tieneTelefono
                ? 'Primero cargá un teléfono en tus datos.'
                : usuario?.telefonoVisible
                  ? 'Cuando aceptes un reclamo, o te acepten uno, la otra persona va a ver tu teléfono.'
                  : 'Tu teléfono no se comparte: la otra parte se comunica con vos sólo a través de la app.'}
            </Text>
          </View>
          <Switch
            value={Boolean(usuario?.telefonoVisible)}
            onValueChange={cambiarVisibilidad}
            disabled={!tieneTelefono || guardandoPrivacidad}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
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
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  filaTexto: {
    flex: 1,
  },
  explicacion: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
