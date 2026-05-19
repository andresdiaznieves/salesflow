export type Rol = "SUPERVISOR" | "REPRESENTANTE";

export type TipoNegocio =
  | "TIENDA"
  | "BAR"
  | "RESTAURANTE"
  | "SUPERMERCADO"
  | "PUNTO_DE_VENTA"
  | "OTRO";

export type Segmento = "A" | "B" | "C" | "D";

export interface Usuario {
  id: string;
  email: string;
  nombre_completo: string;
  rol: Rol;
  codigo_representante?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: string;
  codigo_cliente: string;
  nombre_negocio: string;
  nombre_dueno?: string;
  direccion?: string;
  barrio?: string;
  ciudad?: string;
  telefono?: string;
  tipo_negocio?: TipoNegocio;
  segmento?: Segmento;
  codigo_representante?: string;
  latitud?: number;
  longitud?: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Visita {
  id: string;
  cliente_id: string;
  usuario_id: string;
  fecha_visita: string;
  comentario: string;
  editado: boolean;
  fecha_edicion?: string;
  created_at: string;
  usuario?: Pick<Usuario, "nombre_completo" | "rol">;
}

export interface DatoVenta {
  id: string;
  codigo_cliente: string;
  codigo_representante?: string;
  ciudad?: string;
  punto_de_venta?: string;
  marca: string;
  mes: string;
  ano: number;
  volumen_cajas: number;
  ventas_cop: number;
  inversion_trade_cop: number;
  margen_porcentaje: number;
  participacion_premium_porcentaje: number;
  eventos_ejecutados: number;
  sell_out_porcentaje: number;
  created_at: string;
  updated_at: string;
}

export interface MetaMensual {
  id: string;
  codigo_representante: string;
  mes: string;
  ano: number;
  meta_volumen_cajas: number;
  meta_ventas_cop: number;
  meta_margen_porcentaje: number;
  meta_eventos: number;
  metas_por_marca: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export type TipoNotificacion = "visita_pendiente" | "rendimiento_equipo" | "meta_riesgo" | "general";

export interface Notificacion {
  id: string;
  usuario_id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  leida: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}
