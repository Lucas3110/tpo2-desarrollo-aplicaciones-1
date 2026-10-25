// Pantallas de antes de entrar: login, registro con OTP y recupero.
// Todo esto es del punto 1.
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import { pantallaPendiente } from '../components/PantallaPendiente';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />

      {/* Punto 1: las reemplaza por las pantallas reales */}
      <Stack.Screen name="Registro" component={pantallaPendiente('Registro', 1)} />
      <Stack.Screen name="VerificarCodigo" component={pantallaPendiente('Verificar codigo', 1)} />
      <Stack.Screen name="RecuperarPassword" component={pantallaPendiente('Recuperar contrasena', 1)} />
    </Stack.Navigator>
  );
}
