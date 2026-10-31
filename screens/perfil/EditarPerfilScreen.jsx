// Punto 2: editar los datos personales (nombre, foto, barrio y teléfono).
//
// La foto se sube apenas se elige, no al tocar "Guardar": así, cuando la
// persona termina de completar el resto, la foto ya está arriba y guardar
// es instantáneo. Si la sube y después se arrepiente, no pasa nada: el
// perfil sólo cambia cuando se guarda.
//
// El email no se edita acá. Cambiarlo obliga a verificar el nuevo con un
// código, y es otro caso de uso.
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Aviso from '../../components/Aviso';
import Avatar from '../../components/Avatar';
import Boton from '../../components/Boton';
import CampoTexto from '../../components/CampoTexto';
import SelectorLista from '../../components/SelectorLista';
import { useAuth } from '../../hooks/useAuth';
import { elegirDeGaleria, subirFoto } from '../../services/fotoService';
import { actualizarMisDatos } from '../../services/perfilService';
import { obtenerBarrios } from '../../services/publicacionService';
import {
  LIMITES,
  validarFormulario,
  validarNombre,
  validarTelefono,
} from '../../utils/validaciones';
import { colors, fontSizes, spacing } from '../../config/theme';

export default function EditarPerfilScreen({ navigation }) {
  const { usuario, actualizarUsuario } = useAuth();

  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [telefono, setTelefono] = useState(usuario?.telefono ?? '');
  const [barrioId, setBarrioId] = useState(usuario?.zona?.id ?? null);
  const [fotoUrl, setFotoUrl] = useState(usuario?.fotoUrl ?? null);

  const [barrios, setBarrios] = useState([]);
  const [errorBarrios, setErrorBarrios] = useState(null);
  const [errores, setErrores] = useState({});
  const [errorPedido, setErrorPedido] = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function cargarBarrios() {
    setErrorBarrios(null);
    try {
      setBarrios(await obtenerBarrios());
    } catch (e) {
      setErrorBarrios(e.message);
    }
  }

  useEffect(() => {
    cargarBarrios();
  }, []);

  async function cambiarFoto() {
    setErrorPedido(null);
    try {
      const [asset] = await elegirDeGaleria(1);
      if (!asset) return; // canceló
      setSubiendoFoto(true);
      setFotoUrl(await subirFoto(asset));
    } catch (e) {
      setErrorPedido(e.message);
    } finally {
      setSubiendoFoto(false);
    }
  }

  async function guardar() {
    const malos = validarFormulario({
      nombre: validarNombre(nombre),
      telefono: validarTelefono(telefono),
    });
    setErrores(malos);
    setErrorPedido(null);
    if (Object.keys(malos).length > 0) return;

    setGuardando(true);
    try {
      const actualizado = await actualizarMisDatos({
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        barrioId,
        fotoUrl,
      });
      await actualizarUsuario(actualizado);
      navigation.goBack();
    } catch (e) {
      // TELEFONO_INVALIDO, ZONA_INEXISTENTE...: el backend lo explica.
      setErrorPedido(e.message);
      setGuardando(false);
    }
  }

  const ocupado = subiendoFoto || guardando;

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <View style={styles.cabecera}>
          <View>
            <Avatar nombre={nombre} fotoUrl={fotoUrl} tamano={104} />
            {subiendoFoto ? (
              <View style={styles.subiendo}>
                <ActivityIndicator color={colors.white} />
              </View>
            ) : null}
          </View>
          <View style={styles.accionesFoto}>
            <TouchableOpacity onPress={cambiarFoto} disabled={ocupado} hitSlop={8}>
              <Text style={styles.enlace}>{fotoUrl ? 'Cambiar foto' : 'Agregar foto'}</Text>
            </TouchableOpacity>
            {fotoUrl ? (
              <TouchableOpacity onPress={() => setFotoUrl(null)} disabled={ocupado} hitSlop={8}>
                <Text style={[styles.enlace, styles.quitar]}>Quitar</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <Aviso mensaje={errorPedido} />

        <CampoTexto
          etiqueta="Nombre"
          value={nombre}
          onChangeText={(texto) => {
            setNombre(texto);
            setErrores((previos) => ({ ...previos, nombre: undefined }));
          }}
          error={errores.nombre}
          maxLength={LIMITES.NOMBRE_MAX}
          autoCapitalize="words"
        />

        {errorBarrios ? (
          <View style={styles.errorBarrios}>
            <Aviso mensaje={`No pudimos traer los barrios: ${errorBarrios}`} />
            <Boton titulo="Reintentar" onPress={cargarBarrios} variante="secundario" />
          </View>
        ) : (
          <SelectorLista
            etiqueta="Barrio"
            placeholder="Elegí tu barrio"
            tituloModal="¿En qué barrio estás?"
            opciones={barrios}
            valor={barrioId}
            onElegir={setBarrioId}
          />
        )}

        <CampoTexto
          etiqueta="Teléfono de contacto (opcional)"
          placeholder="11 5555-1234"
          value={telefono}
          onChangeText={(texto) => {
            setTelefono(texto);
            setErrores((previos) => ({ ...previos, telefono: undefined }));
          }}
          error={errores.telefono}
          maxLength={LIMITES.TELEFONO_MAX}
          keyboardType="phone-pad"
        />

        <View style={styles.botones}>
          <Boton titulo="Guardar" onPress={guardar} cargando={guardando} deshabilitado={subiendoFoto} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contenido: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  cabecera: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  subiendo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 52,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accionesFoto: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  enlace: {
    fontSize: fontSizes.md,
    color: colors.secondary,
    fontWeight: 'bold',
  },
  quitar: {
    color: colors.danger,
  },
  errorBarrios: {
    marginBottom: spacing.md,
  },
  botones: {
    marginTop: spacing.md,
  },
});
