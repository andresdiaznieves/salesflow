import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const visitaSchema = z.object({
  cliente_id: z.string().uuid(),
  comentario: z
    .string()
    .min(20, "El comentario debe tener al menos 20 caracteres"),
  fecha_visita: z.string().optional(),
});

export const clienteSchema = z.object({
  codigo_cliente: z.string().min(1, "El código es requerido"),
  nombre_negocio: z.string().min(1, "El nombre del negocio es requerido"),
  nombre_dueno: z.string().optional(),
  direccion: z.string().optional(),
  barrio: z.string().optional(),
  ciudad: z.string().optional(),
  telefono: z.string().optional(),
  tipo_negocio: z
    .enum(["TIENDA", "BAR", "RESTAURANTE", "SUPERMERCADO", "PUNTO_DE_VENTA", "OTRO"])
    .optional(),
  segmento: z.enum(["A", "B", "C", "D"]).optional(),
  codigo_representante: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type VisitaInput = z.infer<typeof visitaSchema>;
export type ClienteInput = z.infer<typeof clienteSchema>;
