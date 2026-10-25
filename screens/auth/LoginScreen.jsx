// Placeholder del login. Lo reemplaza la rama feature/punto1-login por el
// formulario real contra POST /auth/login.
//
// El boton de "Entrar (provisorio)" entra con un usuario de mentira para que
// el resto del equipo pueda ver las pantallas de adentro mientras el login
// real se construye.
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Boton from '../../components/Boton';
import { useAuth } from '../../hooks/useAuth';
import { colors, fontSizes, spacing } from '../../config/theme';

export default function LoginScreen({ navigation }) {
  const { iniciarSesion } = useAuth();

  const entrarDeMentira = () => {
    iniciarSesion('token-de-prueba', {
      nombre: 'Vecino de prueba',
      email: 'prueba@hallado.test',
    });
  };

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Hallado</Text>
      <Text style={styles.bajada}>Objetos y mascotas perdidas</Text>

      <Boton titulo="Crear cuenta" onPress={() => navigation.navigate('Registro')} />

      <TouchableOpacity style={styles.provisorio} onPress={entrarDeMentira}>
        <Text style={styles.enlace}>Entrar sin login (provisorio)</Text>
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
  provisorio: {
    marginTop: spacing.lg,
  },
  enlace: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: 'bold',
  },
  nota: {
    marginTop: spacing.md,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
});
