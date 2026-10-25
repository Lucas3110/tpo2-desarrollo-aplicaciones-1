// Pantallas de adentro de la app.
//
// Cada punto de la consigna registra las suyas aca. Las que todavia no
// existen quedan apuntando a pantallaPendiente(), asi el que necesita
// navegar hacia una pantalla ajena puede hacerlo hoy sin esperar a nadie:
// cuando el otro mergee, se cambia el component y nada mas.
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BuscadorScreen from '../screens/buscador/BuscadorScreen';
import { pantallaPendiente } from '../components/PantallaPendiente';
import { colors } from '../config/theme';

const Stack = createNativeStackNavigator();

const opcionesHeader = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: 'bold' },
};

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={opcionesHeader}>
      {/* Punto 3 - buscador guiado y resultados */}
      <Stack.Screen name="Buscador" component={BuscadorScreen} options={{ title: 'Hallado' }} />
      <Stack.Screen name="Resultados" component={pantallaPendiente('Resultados', 3)} options={{ title: 'Resultados' }} />

      {/* Punto 4 - detalle */}
      <Stack.Screen name="DetallePublicacion" component={pantallaPendiente('Detalle', 4)} options={{ title: 'Publicacion' }} />

      {/* Punto 5 - publicar */}
      <Stack.Screen name="Publicar" component={pantallaPendiente('Publicar', 5)} options={{ title: 'Publicar' }} />
      <Stack.Screen name="MisPublicaciones" component={pantallaPendiente('Mis publicaciones', 5)} options={{ title: 'Mis publicaciones' }} />

      {/* Punto 2 - perfil */}
      <Stack.Screen name="Perfil" component={pantallaPendiente('Mi perfil', 2)} options={{ title: 'Mi perfil' }} />
      <Stack.Screen name="PerfilPublico" component={pantallaPendiente('Perfil publico', 2)} options={{ title: 'Perfil' }} />
      <Stack.Screen name="Configuracion" component={pantallaPendiente('Configuracion', 1)} options={{ title: 'Configuracion' }} />

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
