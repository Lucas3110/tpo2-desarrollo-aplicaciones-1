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
import DetallePublicacionScreen from '../screens/detalle/DetallePublicacionScreen';
import ReclamarScreen from '../screens/reclamos/ReclamarScreen';
import MisReclamosScreen from '../screens/reclamos/MisReclamosScreen';
import DetalleReclamoScreen from '../screens/reclamos/DetalleReclamoScreen';
import HistorialScreen from '../screens/historial/HistorialScreen';
import ValorarScreen from '../screens/historial/ValorarScreen';
import PerfilScreen from '../screens/perfil/PerfilScreen';
import EditarPerfilScreen from '../screens/perfil/EditarPerfilScreen';
import PerfilPublicoScreen from '../screens/perfil/PerfilPublicoScreen';
import MisAlertasScreen from '../screens/alertas/MisAlertasScreen';
import AlertaResultadosScreen from '../screens/alertas/AlertaResultadosScreen';
import SeguidasScreen from '../screens/seguidas/SeguidasScreen';
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
      <Stack.Screen name="DetallePublicacion" component={DetallePublicacionScreen} options={{ title: 'Publicación' }} />

      {/* Punto 5 - publicar */}
      <Stack.Screen name="Publicar" component={PublicarScreen} options={{ title: 'Publicar' }} />
      <Stack.Screen name="MisPublicaciones" component={MisPublicacionesScreen} options={{ title: 'Mis publicaciones' }} />

      {/* Punto 2 - perfil */}
      <Stack.Screen name="Perfil" component={PerfilScreen} options={{ title: 'Mi perfil' }} />
      <Stack.Screen name="EditarPerfil" component={EditarPerfilScreen} options={{ title: 'Editar mis datos' }} />
      <Stack.Screen name="PerfilPublico" component={PerfilPublicoScreen} options={{ title: 'Perfil' }} />
      <Stack.Screen name="Configuracion" component={ConfiguracionScreen} options={{ title: 'Configuracion' }} />

      {/* Punto 7 - reclamos */}
      <Stack.Screen name="Reclamar" component={ReclamarScreen} options={{ title: 'Reclamo' }} />
      <Stack.Screen name="MisReclamos" component={MisReclamosScreen} options={{ title: 'Mis reclamos' }} />
      <Stack.Screen name="DetalleReclamo" component={DetalleReclamoScreen} options={{ title: 'Reclamo' }} />

      {/* Punto 8 - devolucion y punto de encuentro */}
      <Stack.Screen name="PuntoDeEncuentro" component={pantallaPendiente('Punto de encuentro', 8)} options={{ title: 'Punto de encuentro' }} />

      {/* Punto 9 - alertas y seguidas */}
      <Stack.Screen name="MisAlertas" component={MisAlertasScreen} options={{ title: 'Mis alertas' }} />
      <Stack.Screen name="AlertaResultados" component={AlertaResultadosScreen} options={{ title: 'Alerta' }} />
      <Stack.Screen name="Seguidas" component={SeguidasScreen} options={{ title: 'Seguidas' }} />

      {/* Punto 10 - historial y valoraciones */}
      <Stack.Screen name="Historial" component={HistorialScreen} options={{ title: 'Historial' }} />
      <Stack.Screen name="Valorar" component={ValorarScreen} options={{ title: 'Valorar' }} />
    </Stack.Navigator>
  );
}
