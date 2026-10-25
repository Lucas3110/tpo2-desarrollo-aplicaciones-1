// Punto 1: la pantalla que tapa la app cuando la sesión está bloqueada.
//
// Pide la huella sola al aparecer, para que no haya que tocar un botón de
// más. Si se cancela o falla, el botón queda ahí para reintentar.
//
// El "Ingresar con mi contraseña" no es un adorno: es la salida de
// emergencia. Si la huella deja de leerse (dedo lastimado, lector roto) sin
// esto la persona queda afuera de su propia cuenta para siempre. Cierra la
// sesión y la manda al login, que es un camino que siempre funciona.
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Boton from '../../components/Boton';
import { useAuth } from '../../hooks/useAuth';
import { useBiometria } from '../../hooks/useBiometria';
import { colors, fontSizes, spacing } from '../../config/theme';

export default function DesbloqueoScreen() {
  const { usuario, cerrarSesion } = useAuth();
  const { desbloquear } = useBiometria();
  const [rechazado, setRechazado] = useState(false);
  const [pidiendo, setPidiendo] = useState(false);

  // Para no disparar el prompt dos veces si el componente se vuelve a
  // renderizar antes de que la persona conteste.
  const pidiendoRef = useRef(false);

  const intentar = async () => {
    if (pidiendoRef.current) return;
    pidiendoRef.current = true;
    setPidiendo(true);
    setRechazado(false);
    try {
      const ok = await desbloquear();
      if (!ok) setRechazado(true);
    } finally {
      pidiendoRef.current = false;
      setPidiendo(false);
    }
  };

  // Al aparecer, pide la huella sin esperar que toquen nada.
  useEffect(() => {
    intentar();
  }, []);

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Hallado</Text>
      <Text style={styles.bajada}>
        {usuario?.nombre ? `Hola de nuevo, ${usuario.nombre}` : 'Sesión bloqueada'}
      </Text>

      <Text style={styles.instruccion}>
        {rechazado
          ? 'No pudimos verificar tu identidad.'
          : 'Usá tu huella para entrar.'}
      </Text>

      <Boton
        titulo={rechazado ? 'Probar de nuevo' : 'Usar huella'}
        onPress={intentar}
        cargando={pidiendo}
      />

      <TouchableOpacity style={styles.salida} onPress={cerrarSesion}>
        <Text style={styles.enlace}>Ingresar con mi contraseña</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  titulo: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  bajada: {
    fontSize: fontSizes.md,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  instruccion: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  salida: {
    marginTop: spacing.lg,
  },
  enlace: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: 'bold',
  },
});
