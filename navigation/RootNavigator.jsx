// El unico lugar que decide si la persona ve el login o la app.
//
// Mientras restauramos la sesion guardada mostramos un spinner: si no,
// se veria el login por un instante antes de entrar al home.
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../config/theme';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';

export default function RootNavigator() {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
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
