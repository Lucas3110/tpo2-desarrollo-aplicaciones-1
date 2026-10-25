// Placeholder del login. El punto 1 lo reemplaza por el formulario real
// contra POST /auth/login.
//
// Por ahora entra con un usuario de mentira para que el resto del equipo
// pueda ver las pantallas de adentro mientras el punto 1 se construye.
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { colors, fontSizes, radius, spacing } from '../../config/theme';

export default function LoginScreen() {
  const { iniciarSesion } = useAuth();

  const entrarDeMentira = () => {
    iniciarSesion('token-de-prueba', { nombre: 'Vecino de prueba', email: 'prueba@hallado.test' });
  };

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Hallado</Text>
      <Text style={styles.bajada}>Objetos y mascotas perdidas</Text>

      <TouchableOpacity style={styles.boton} onPress={entrarDeMentira} activeOpacity={0.8}>
        <Text style={styles.textoBoton}>Entrar (provisorio)</Text>
      </TouchableOpacity>

      <Text style={styles.nota}>Punto 1 - login real pendiente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  titulo: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  bajada: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  boton: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  textoBoton: {
    color: colors.white,
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  nota: {
    marginTop: spacing.md,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
});
