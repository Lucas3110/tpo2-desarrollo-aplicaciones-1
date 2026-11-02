// Modelo de `publicaciones_cacheadas` para WatermelonDB.
import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class PublicacionCacheada extends Model {
  static table = 'publicaciones_cacheadas';

  @field('publicacion_id') publicacionId;
  @text('tipo') tipo;
  @text('titulo') titulo;
  @text('descripcion') descripcion;
  @text('estado') estado;
  @text('fecha_suceso') fechaSuceso;
  @text('franja_horaria') franjaHoraria;
  @text('barrio_nombre') barrioNombre;
  @text('categoria_nombre') categoriaNombre;
  @text('fotos_json') fotosJson;
  @text('datos_json') datosJson;
  @text('acciones_json') accionesJson;
  @field('es_ultimo_resultado') esUltimoResultado;
  @field('consultado_en') consultadoEn;

  // Reconstruye el objeto que esperan TarjetaResultado y DetallePublicacionScreen.
  aDtoPublicacion() {
    try {
      return JSON.parse(this.datosJson);
    } catch {
      return {
        id: this.publicacionId,
        tipo: this.tipo,
        titulo: this.titulo,
        descripcion: this.descripcion,
        estado: this.estado,
        fechaSuceso: this.fechaSuceso,
        franjaHoraria: this.franjaHoraria,
        barrio: { nombre: this.barrioNombre },
        categoria: { nombre: this.categoriaNombre },
        fotos: this.fotos,
      };
    }
  }

  get fotos() {
    try {
      return JSON.parse(this.fotosJson) ?? [];
    } catch {
      return [];
    }
  }

  get acciones() {
    if (!this.accionesJson) return null;
    try {
      return JSON.parse(this.accionesJson);
    } catch {
      return null;
    }
  }
}

