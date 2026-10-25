// El unico lugar que decide que ve la persona.
//
// Son tres estados y se evaluan en este orden:
//
//   1. cargando  -> spinner. Mientras restauramos la sesion guardada y
//                   averiguamos si hay biometria no sabemos que mostrar, y
//                   adivinar hace que se vea el login un instante antes de
//                   entrar al home.
//   2. bloqueada -> la pantalla de desbloqueo, tapando todo. Va ANTES de
//                   MainNavigator a proposito: si estuviera adentro, la app
//                   se dibujaria abajo y se veria de reojo.
//   3. el resto  -> login si no hay sesion, la app si hay.
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useBiometria } from '../hooks/useBiometria';
import { colors } from '../config/theme';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import DesbloqueoScreen from '../screens/auth/DesbloqueoScreen';

export default function RootNavigator() {
  const { usuario, cargando: cargandoSesion } = useAuth();
  const { bloqueada, cargando: cargandoBiometria } = useBiometria();

  if (cargandoSesion || cargandoBiometria) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (usuario !== null && bloqueada) {
    return <DesbloqueoScreen />;
  }

  return usuario === null ? <AuthNavigator /> : <MainNavigator />;
}

const styles = StyleSheet.create({
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
