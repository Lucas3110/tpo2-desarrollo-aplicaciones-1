// El unico lugar que decide que ve la persona.
//
// Son tres estados y se evaluan en este orden:
//
//   1. cargando  -> spinner. Mientras restauramos la sesion guardada y
//                   averiguamos si hay biometria no sabemos que mostrar, y
//                   adivinar hace que se vea el login un instante antes de
//                   entrar al home.
//   2. bloqueada -> la pantalla de desbloqueo ENCIMA de la app, tapandola.
//   3. el resto  -> login si no hay sesion, la app si hay.
//
// Lo de "encima" es importante y costo un bug. Antes se devolvia la pantalla
// de desbloqueo EN LUGAR de MainNavigator, y eso lo desmonta: al desmontarse
// se pierde la pila de navegacion entera. Al desbloquear volvias al buscador,
// no a donde estabas. Si estabas a mitad de publicar algo, perdias el paso.
//
// Ahora el navegador se queda montado abajo y la pantalla de desbloqueo lo
// tapa con un View absoluto de fondo opaco. No se ve nada de la app atras, y
// al desbloquear seguis exactamente donde estabas.
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

  if (usuario === null) return <AuthNavigator />;

  return (
    <View style={styles.pila}>
      <MainNavigator />

      {bloqueada ? (
        <View style={styles.tapa}>
          <DesbloqueoScreen />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pila: {
    flex: 1,
  },
  // Absoluto y con fondo opaco: tapa la app entera, no se ve nada abajo.
  // elevation para que en Android quede por encima del header del navegador,
  // que dibuja con su propia elevacion.
  tapa: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    elevation: 10,
    zIndex: 10,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
