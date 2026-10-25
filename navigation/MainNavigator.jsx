// Pantallas de adentro de la app.
//
// Cada punto de la consigna registra las suyas aca. Las que todavia no
// existen quedan apuntando a pantallaPendiente(), asi el que necesita
// navegar hacia una pantalla ajena puede hacerlo hoy sin esperar a nadie:
// cuando el otro mergee, se cambia el component y nada mas.
import { Text, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BuscadorScreen from '../screens/buscador/BuscadorScreen';
import ConfiguracionScreen from '../screens/configuracion/ConfiguracionScreen';
import PublicarScreen from '../screens/publicar/PublicarScreen';
import MisPublicacionesScreen from '../screens/publicar/MisPublicacionesScreen';
import MenuScreen from '../screens/menu/MenuScreen';
import ResultadosScreen from '../screens/buscador/ResultadosScreen';
import { pantallaPendiente } from '../components/PantallaPendiente';
import { colors } from '../config/theme';

const Stack = createNativeStackNavigator();

const opcionesHeader = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: 'bold' },
  // El header es verde oscuro: los iconos de la barra de estado van claros.
  statusBarStyle: 'light',
};

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={opcionesHeader}>
      {/* Punto 3 - buscador guiado y resultados */}
      <Stack.Screen
        name="Buscador"
        component={BuscadorScreen}
        options={({ navigation }) => ({
          title: 'Hallado',
          // El enunciado pide que al entrar se vea el buscador y nada mas,
          // asi que el resto de la app cuelga de este boton.
          headerRight: () => (
            <TouchableOpacity onPress={() => navigation.navigate('Menu')} hitSlop={12}>
              <Text style={{ color: colors.white, fontSize: 15, fontWeight: 'bold' }}>Menu</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen name="Menu" component={MenuScreen} options={{ title: 'Menu' }} />
      <Stack.Screen name="Resultados" component={ResultadosScreen} options={{ title: 'Resultados' }} />

      {/* Punto 4 - detalle */}
      <Stack.Screen name="DetallePublicacion" component={pantallaPendiente('Detalle', 4)} options={{ title: 'Publicacion' }} />

      {/* Punto 5 - publicar */}
      <Stack.Screen name="Publicar" component={PublicarScreen} options={{ title: 'Publicar' }} />
      <Stack.Screen name="MisPublicaciones" component={MisPublicacionesScreen} options={{ title: 'Mis publicaciones' }} />

      {/* Punto 2 - perfil */}
      <Stack.Screen name="Perfil" component={pantallaPendiente('Mi perfil', 2)} options={{ title: 'Mi perfil' }} />
      <Stack.Screen name="PerfilPublico" component={pantallaPendiente('Perfil publico', 2)} options={{ title: 'Perfil' }} />
      <Stack.Screen name="Configuracion" component={ConfiguracionScreen} options={{ title: 'Configuracion' }} />

      {/* Punto 7 - reclamos */}
      <Stack.Screen name="Reclamar" component={pantallaPendiente('Reclamar', 7)} options={{ title: 'Reclamo' }} />
      <Stack.Screen name="MisReclamos" component={pantallaPendiente('Mis reclamos', 7)} options={{ title: 'Mis reclamos' }} />

      {/* Punto 8 - devolucion y punto de encuentro */}
      <Stack.Screen name="PuntoDeEncuentro" component={pantallaPendiente('Punto de encuentro', 8)} options={{ title: 'Punto de encuentro' }} />

      {/* Punto 9 - alertas y seguidas */}
      <Stack.Screen name="MisAlertas" component={pantallaPendiente('Mis alertas', 9)} options={{ title: 'Mis alertas' }} />
      <Stack.Screen name="Seguidas" component={pantallaPendiente('Seguidas', 9)} options={{ title: 'Seguidas' }} />

      {/* Punto 10 - historial y valoraciones */}
      <Stack.Screen name="Historial" component={pantallaPendiente('Historial', 10)} options={{ title: 'Historial' }} />
    </Stack.Navigator>
  );
}
