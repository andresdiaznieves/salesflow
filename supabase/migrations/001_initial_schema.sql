-- SalesFlow MVP Schema
-- Tables: usuarios, clientes, visitas, datos_venta

-- 1. USUARIOS (extends Supabase Auth)
CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre_completo TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('SUPERVISOR', 'REPRESENTANTE')),
  codigo_representante TEXT UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CLIENTES
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_cliente TEXT NOT NULL UNIQUE,
  nombre_negocio TEXT NOT NULL,
  nombre_dueno TEXT,
  direccion TEXT,
  barrio TEXT,
  ciudad TEXT,
  telefono TEXT,
  tipo_negocio TEXT CHECK (tipo_negocio IN ('TIENDA', 'BAR', 'RESTAURANTE', 'SUPERMERCADO', 'PUNTO_DE_VENTA', 'OTRO')),
  segmento TEXT CHECK (segmento IN ('A', 'B', 'C', 'D')),
  codigo_representante TEXT,
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clientes_representante ON public.clientes(codigo_representante);
CREATE INDEX idx_clientes_codigo ON public.clientes(codigo_cliente);

-- 3. VISITAS
CREATE TABLE public.visitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
  fecha_visita TIMESTAMPTZ NOT NULL DEFAULT now(),
  comentario TEXT NOT NULL CHECK (char_length(comentario) >= 20),
  editado BOOLEAN NOT NULL DEFAULT false,
  fecha_edicion TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_visitas_cliente ON public.visitas(cliente_id);
CREATE INDEX idx_visitas_usuario ON public.visitas(usuario_id);
CREATE INDEX idx_visitas_fecha ON public.visitas(fecha_visita DESC);

-- 4. DATOS DE VENTA (imported from Excel)
CREATE TABLE public.datos_venta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_cliente TEXT NOT NULL,
  codigo_representante TEXT,
  ciudad TEXT,
  punto_de_venta TEXT,
  marca TEXT NOT NULL,
  mes TEXT NOT NULL,
  ano INTEGER NOT NULL,
  volumen_cajas INTEGER NOT NULL DEFAULT 0,
  ventas_cop BIGINT NOT NULL DEFAULT 0,
  inversion_trade_cop BIGINT NOT NULL DEFAULT 0,
  margen_porcentaje DOUBLE PRECISION DEFAULT 0,
  participacion_premium_porcentaje DOUBLE PRECISION DEFAULT 0,
  eventos_ejecutados INTEGER DEFAULT 0,
  sell_out_porcentaje DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(codigo_cliente, marca, mes, ano)
);

CREATE INDEX idx_datos_venta_cliente ON public.datos_venta(codigo_cliente);
CREATE INDEX idx_datos_venta_rep ON public.datos_venta(codigo_representante);
CREATE INDEX idx_datos_venta_periodo ON public.datos_venta(ano, mes);

-- 5. ROW LEVEL SECURITY

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datos_venta ENABLE ROW LEVEL SECURITY;

-- Usuarios: everyone can read their own profile, supervisors read all
CREATE POLICY "Users can read own profile"
  ON public.usuarios FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Supervisors can read all profiles"
  ON public.usuarios FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'SUPERVISOR')
  );

-- Clientes: representantes ven sus clientes, supervisores ven todos
CREATE POLICY "Representantes read own clients"
  ON public.clientes FOR SELECT
  USING (
    codigo_representante = (
      SELECT codigo_representante FROM public.usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "Supervisors read all clients"
  ON public.clientes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'SUPERVISOR')
  );

CREATE POLICY "Supervisors manage all clients"
  ON public.clientes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'SUPERVISOR')
  );

-- Visitas: representantes ven visitas de sus clientes, supervisores ven todas
CREATE POLICY "Representantes read visits on own clients"
  ON public.visitas FOR SELECT
  USING (
    cliente_id IN (
      SELECT id FROM public.clientes
      WHERE codigo_representante = (
        SELECT codigo_representante FROM public.usuarios WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Supervisors read all visits"
  ON public.visitas FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'SUPERVISOR')
  );

CREATE POLICY "Users can create visits"
  ON public.visitas FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Users can update own visits"
  ON public.visitas FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Datos de venta: representantes ven datos de sus clientes, supervisores ven todos
CREATE POLICY "Representantes read own sales data"
  ON public.datos_venta FOR SELECT
  USING (
    codigo_representante = (
      SELECT codigo_representante FROM public.usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "Supervisors read all sales data"
  ON public.datos_venta FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'SUPERVISOR')
  );

CREATE POLICY "Supervisors manage sales data"
  ON public.datos_venta FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'SUPERVISOR')
  );

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_usuarios
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_clientes
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_datos_venta
  BEFORE UPDATE ON public.datos_venta
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
