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
// Lo de "encima" costo dos bugs seguidos, asi que vale explicarlo.
//
// Al principio se devolvia la pantalla de desbloqueo EN LUGAR de
// MainNavigator. Eso lo desmonta, y al desmontarse se pierde la pila de
// navegacion entera: al desbloquear volvias al buscador y no a donde
// estabas. Si estabas a mitad de publicar algo, perdias el paso.
//
// El segundo intento fue dejar el navegador montado y taparlo con un View
// absoluto. Se filtraba: se veia el menu abajo y el boton de la pantalla de
// desbloqueo corrido al final, y peor, la app seguia siendo usable atras.
//
// Esto es un Modal, que en Android es una ventana del sistema aparte: no
// comparte layout con nada, no hay z-index ni elevation que puedan fallar, y
// lo de abajo no recibe toques. Con onRequestClose vacio el boton de atras
// tampoco lo cierra, que es lo que corresponde: la pantalla de desbloqueo no
// se esquiva. Y MainNavigator sigue montado, asi que al desbloquear seguis
// exactamente donde estabas.
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';
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

      <Modal
        visible={bloqueada}
        animationType="fade"
        statusBarTranslucent
        // El boton de atras no cierra el desbloqueo: si lo cerrara, quedarias
        // adentro de la app sin haber pasado la huella.
        onRequestClose={() => {}}
      >
        <DesbloqueoScreen />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pila: {
    flex: 1,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
