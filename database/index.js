// Instancia única de WatermelonDB para toda la app.
//
// Usa SQLiteAdapter sobre development build (`npx expo run:android`).
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import PublicacionCacheada from './models/PublicacionCacheada';
import PublicacionPendiente from './models/PublicacionPendiente';

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'hallado_db',
  // En Android con Expo prebuild estándar, el bridge SQLite autolinkeado
  // funciona directo sin tocar MainApplication.kt si jsi está en false.
  jsi: false,
  onSetUpError: (error) => {
    if (__DEV__) {
      console.warn('[WatermelonDB] Error al inicializar la base local:', error);
    }
  },
});

export const database = new Database({
  adapter,
  modelClasses: [PublicacionCacheada, PublicacionPendiente],
});

export const tablaCacheadas = database.get('publicaciones_cacheadas');
export const tablaPendientes = database.get('publicaciones_pendientes');

