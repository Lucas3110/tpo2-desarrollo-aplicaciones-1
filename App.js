import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './context/AuthContext';
import { BiometriaProvider } from './context/BiometriaContext';
import RootNavigator from './navigation/RootNavigator';

// Componente raiz. Solo arma las capas que tienen que envolver a todo:
//   SafeAreaProvider    -> para no dibujar debajo de la barra de estado
//   AuthProvider        -> la sesion, disponible en cualquier pantalla
//   BiometriaProvider   -> adentro de AuthProvider porque necesita saber si
//                          hay sesion: la biometria desbloquea una sesion que
//                          ya existe, no reemplaza al login
//   NavigationContainer -> React Navigation necesita estar en la raiz para
//                          poder navegar desde cualquier lado
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BiometriaProvider>
          <NavigationContainer>
            {/* Iconos oscuros: las pantallas de sesion tienen fondo claro. Las de
                adentro, que tienen el header verde, lo pisan con statusBarStyle
                en MainNavigator. */}
            <StatusBar style="dark" />
            <RootNavigator />
          </NavigationContainer>
        </BiometriaProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
