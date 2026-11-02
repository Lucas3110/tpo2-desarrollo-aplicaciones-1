// Punto 6: esquema local de WatermelonDB.
//
// Dos tablas:
//   1. publicaciones_cacheadas -> conserva las últimas publicaciones que la
//      persona consultó (detalle, fotos y barrio) y los últimos resultados de
//      búsqueda cargados exitosamente para verlos sin conexión.
//   2. publicaciones_pendientes -> cola de salida para las publicaciones que
//      se crean sin internet y se envían automáticamente al recuperar la red.
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'publicaciones_cacheadas',
      columns: [
        // ID numérico real del backend, indexado para buscar rápido por id.
        { name: 'publicacion_id', type: 'number', isIndexed: true },
        { name: 'tipo', type: 'string' }, // 'PERDI' | 'ENCONTRE'
        { name: 'titulo', type: 'string' },
        { name: 'descripcion', type: 'string', isOptional: true },
        { name: 'estado', type: 'string' },
        { name: 'fecha_suceso', type: 'string' },
        { name: 'franja_horaria', type: 'string' },
        { name: 'barrio_nombre', type: 'string' },
        { name: 'categoria_nombre', type: 'string' },
        // Array de objetos/URLs de fotos serializado en JSON.
        { name: 'fotos_json', type: 'string' },
        // Objeto completo de la publicación tal como sale del DTO del backend.
        // Guardarlo entero evita que al reconstruir la vista sin conexión
        // falten campos anidados (publicador, reputación, coordenadas, etc.).
        { name: 'datos_json', type: 'string' },
        // Objeto `acciones` de GET /hallado/publicaciones/:id (esOptional
        // porque cuando una publicación entra desde el listado de búsqueda
        // todavía no tiene las acciones del detalle).
        { name: 'acciones_json', type: 'string', isOptional: true },
        // Marca si formó parte de la última búsqueda exitosa del punto 3.
        { name: 'es_ultimo_resultado', type: 'boolean' },
        // Timestamp (Date.now()) para ordenar por más recientes y limpiar viejas.
        { name: 'consultado_en', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'publicaciones_pendientes',
      columns: [
        // Igual que en borradorService, se separa por usuario por si cambian
        // de cuenta en el mismo teléfono.
        { name: 'usuario_id', type: 'number', isIndexed: true },
        { name: 'tipo', type: 'string' },
        { name: 'titulo', type: 'string' },
        { name: 'barrio_nombre', type: 'string', isOptional: true },
        { name: 'categoria_nombre', type: 'string', isOptional: true },
        // Payload listo para POST /hallado/publicaciones en JSON.
        { name: 'payload_json', type: 'string' },
        // 'PENDIENTE' | 'ENVIANDO' | 'ERROR'
        { name: 'estado_envio', type: 'string' },
        { name: 'ultimo_error', type: 'string', isOptional: true },
        { name: 'creado_en', type: 'number' },
      ],
    }),
  ],
});

