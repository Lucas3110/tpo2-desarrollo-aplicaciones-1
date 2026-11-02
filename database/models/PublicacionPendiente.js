// Modelo de `publicaciones_pendientes` para WatermelonDB.
import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class PublicacionPendiente extends Model {
  static table = 'publicaciones_pendientes';

  @field('usuario_id') usuarioId;
  @text('tipo') tipo;
  @text('titulo') titulo;
  @text('barrio_nombre') barrioNombre;
  @text('categoria_nombre') categoriaNombre;
  @text('payload_json') payloadJson;
  @text('estado_envio') estadoEnvio;
  @text('ultimo_error') ultimoError;
  @field('creado_en') creadoEn;

  get payload() {
    try {
      return JSON.parse(this.payloadJson);
    } catch {
      return null;
    }
  }
}

