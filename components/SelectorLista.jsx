// Selector de muchas opciones: abre un modal con buscador.
//
// Para los barrios no sirven las fichas de SelectorOpciones: son 18 hoy y
// mañana pueden ser 50, y 18 fichas ocupan media pantalla. Un modal con
// buscador escala y se usa igual con 5 que con 500.
//
// Componente puro.
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, fontSizes, radius, spacing } from '../config/theme';

export default function SelectorLista({
  etiqueta,
  placeholder = 'Elegí una opción',
  opciones,
  valor,
  onElegir,
  error,
  tituloModal = 'Elegí una opción',
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const elegida = opciones.find((o) => o.id === valor);

  // Se filtra sin acentos y sin mayúsculas: nadie escribe "Morón" con tilde
  // cuando está buscando rápido.
  const visibles = useMemo(() => {
    const texto = normalizar(busqueda);
    if (texto === '') return opciones;
    return opciones.filter((o) => normalizar(o.nombre).includes(texto));
  }, [opciones, busqueda]);

  const cerrar = () => {
    setAbierto(false);
    setBusqueda('');
  };

  return (
    <View style={styles.contenedor}>
      {etiqueta ? <Text style={styles.etiqueta}>{etiqueta}</Text> : null}

      <TouchableOpacity
        style={[styles.campo, error ? styles.campoConError : null]}
        onPress={() => setAbierto(true)}
        activeOpacity={0.7}
      >
        <Text style={elegida ? styles.valor : styles.placeholder}>
          {elegida ? elegida.nombre : placeholder}
        </Text>
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={abierto} animationType="slide" onRequestClose={cerrar}>
        <View style={styles.modal}>
          <View style={styles.encabezado}>
            <Text style={styles.titulo}>{tituloModal}</Text>
            <TouchableOpacity onPress={cerrar}>
              <Text style={styles.cerrar}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.buscador}
            placeholder="Buscar…"
            placeholderTextColor={colors.textSecondary}
            value={busqueda}
            onChangeText={setBusqueda}
            autoCorrect={false}
            autoFocus
          />

          <FlatList
            data={visibles}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={styles.vacio}>No hay nada que coincida con "{busqueda}"</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.item}
                onPress={() => {
                  onElegir(item.id);
                  cerrar();
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.textoItem, item.id === valor ? styles.textoItemElegido : null]}>
                  {item.nombre}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

const styles = StyleSheet.create({
  contenedor: {
    width: '100%',
    marginBottom: spacing.md,
  },
  etiqueta: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  campo: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  campoConError: {
    borderColor: colors.danger,
  },
  valor: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  placeholder: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  error: {
    marginTop: spacing.xs,
    fontSize: fontSizes.xs,
    color: colors.danger,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.xl,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  titulo: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  cerrar: {
    fontSize: fontSizes.md,
    color: colors.primary,
    fontWeight: 'bold',
  },
  buscador: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  item: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  textoItem: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  textoItemElegido: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  vacio: {
    textAlign: 'center',
    marginTop: spacing.xl,
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
  },
});
