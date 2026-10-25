// Punto 1: "Desde la configuración, la persona puede activar o desactivar el
// desbloqueo de la sesión con la biometría del dispositivo."
//
// El Switch no se maneja solo: activar la biometría pide la huella primero, y
// si la persona cancela el switch tiene que volver a apagarse. Por eso el
// `value` sale del contexto y no de un estado local del Switch.
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Aviso from '../../components/Aviso';
import Boton from '../../components/Boton';
import { useAuth } from '../../hooks/useAuth';
import { useBiometria } from '../../hooks/useBiometria';
import { colors, fontSizes, radius, spacing } from '../../config/theme';

export default function ConfiguracionScreen() {
  const { usuario, cerrarSesion } = useAuth();
  const { disponible, activada, cargando, activar, desactivar } = useBiometria();
  const [aviso, setAviso] = useState(null);
  const [trabajando, setTrabajando] = useState(false);

  const cambiar = async (quiereActivar) => {
    setAviso(null);
    setTrabajando(true);
    try {
      if (quiereActivar) {
        const ok = await activar();
        setAviso(
          ok
            ? { texto: 'Listo. La próxima vez que abras la app te vamos a pedir la huella.', tipo: 'exito' }
            : { texto: 'No se activó: no pudimos verificar tu identidad.', tipo: 'error' }
        );
      } else {
        await desactivar();
        setAviso({ texto: 'Desactivado. Vas a entrar directo.', tipo: 'exito' });
      }
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <Text style={styles.seccion}>Cuenta</Text>
      <View style={styles.tarjeta}>
        <Text style={styles.dato}>{usuario?.nombre}</Text>
        <Text style={styles.datoSecundario}>{usuario?.email}</Text>
      </View>

      <Text style={styles.seccion}>Seguridad</Text>

      {aviso ? <Aviso mensaje={aviso.texto} tipo={aviso.tipo} /> : null}

      <View style={styles.tarjeta}>
        <View style={styles.fila}>
          <View style={styles.filaTexto}>
            <Text style={styles.dato}>Desbloquear con huella</Text>
            <Text style={styles.datoSecundario}>
              {cargando
                ? 'Verificando el dispositivo…'
                : disponible
                  ? 'Te vamos a pedir la huella al abrir la app y al volver de segundo plano.'
                  : 'Este dispositivo no tiene huella configurada. Agregá una desde los ajustes de Android.'}
            </Text>
          </View>

          <Switch
            value={activada}
            onValueChange={cambiar}
            disabled={!disponible || cargando || trabajando}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
      </View>

      <View style={styles.cerrar}>
        <Boton titulo="Cerrar sesión" onPress={cerrarSesion} variante="secundario" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  seccion: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  tarjeta: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  filaTexto: {
    flex: 1,
  },
  dato: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  datoSecundario: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cerrar: {
    marginTop: spacing.xl,
  },
});
