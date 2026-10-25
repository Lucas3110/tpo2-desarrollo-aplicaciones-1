// Pantallas de antes de entrar: login, registro con OTP y recupero.
// Todo esto es del punto 1.
//
// Sin header: cada pantalla trae sus propios enlaces para ir y volver, que
// quedan mas claros que una flecha arriba. El gesto de volver del celular
// sigue funcionando igual.
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegistroEmailScreen from '../screens/auth/RegistroEmailScreen';
import VerificarCodigoScreen from '../screens/auth/VerificarCodigoScreen';
import RecuperarPasswordScreen from '../screens/auth/RecuperarPasswordScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Registro" component={RegistroEmailScreen} />
      <Stack.Screen name="VerificarCodigo" component={VerificarCodigoScreen} />
      <Stack.Screen name="RecuperarPassword" component={RecuperarPasswordScreen} />
    </Stack.Navigator>
  );
}
