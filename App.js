import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './context/AuthContext';
import RootNavigator from './navigation/RootNavigator';

// Componente raiz. Solo arma las capas que tienen que envolver a todo:
//   SafeAreaProvider  -> para no dibujar debajo de la barra de estado
//   AuthProvider      -> la sesion, disponible en cualquier pantalla
//   NavigationContainer -> React Navigation necesita estar en la raiz
//                          para poder navegar desde cualquier lado
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
