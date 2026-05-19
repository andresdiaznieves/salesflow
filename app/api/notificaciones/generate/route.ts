import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const DAYS_THRESHOLD = 7;

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol, codigo_representante")
    .eq("id", user.id)
    .single();

  if (!usuario) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const generated: string[] = [];

  if (usuario.rol === "REPRESENTANTE") {
    await generateVisitasPendientes(supabase, user.id, usuario.codigo_representante, generated);
  } else if (usuario.rol === "SUPERVISOR") {
    await generateRendimientoEquipo(supabase, user.id, generated);
    await generateVisitasPendientesEquipo(supabase, user.id, generated);
  }

  return NextResponse.json({ generated });
}

async function generateVisitasPendientes(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  codigoRep: string | null,
  generated: string[]
) {
  if (!codigoRep) return;

  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, codigo_cliente, nombre_negocio")
    .eq("codigo_representante", codigoRep)
    .eq("activo", true);

  if (!clientes || clientes.length === 0) return;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_THRESHOLD);

  for (const cliente of clientes) {
    const { data: ultimaVisita } = await supabase
      .from("visitas")
      .select("fecha_visita")
      .eq("cliente_id", cliente.id)
      .order("fecha_visita", { ascending: false })
      .limit(1)
      .single();

    const needsVisit = !ultimaVisita || new Date(ultimaVisita.fecha_visita) < cutoffDate;

    if (needsVisit) {
      const { data: existing } = await supabase
        .from("notificaciones")
        .select("id")
        .eq("usuario_id", userId)
        .eq("tipo", "visita_pendiente")
        .eq("leida", false)
        .contains("metadata", { codigo_cliente: cliente.codigo_cliente })
        .limit(1);

      if (existing && existing.length > 0) continue;

      const dias = ultimaVisita
        ? Math.floor((Date.now() - new Date(ultimaVisita.fecha_visita).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      await supabase.from("notificaciones").insert({
        usuario_id: userId,
        tipo: "visita_pendiente",
        titulo: `Visita pendiente: ${cliente.nombre_negocio}`,
        mensaje: dias
          ? `Han pasado ${dias} días desde la última visita a ${cliente.nombre_negocio}. Planifica una visita pronto.`
          : `${cliente.nombre_negocio} no tiene visitas registradas. Agenda una visita.`,
        metadata: { codigo_cliente: cliente.codigo_cliente, cliente_id: cliente.id, dias_sin_visita: dias },
      });

      generated.push(cliente.codigo_cliente);
    }
  }
}

async function generateRendimientoEquipo(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  generated: string[]
) {
  const today = new Date().toISOString().split("T")[0];
  const { data: existing } = await supabase
    .from("notificaciones")
    .select("id")
    .eq("usuario_id", userId)
    .eq("tipo", "rendimiento_equipo")
    .gte("created_at", `${today}T00:00:00`)
    .limit(1);

  if (existing && existing.length > 0) return;

  const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const mesActual = MESES[new Date().getMonth()];
  const anoActual = new Date().getFullYear();

  const { data: metas } = await supabase
    .from("metas_mensuales")
    .select("*")
    .eq("mes", mesActual)
    .eq("ano", anoActual);

  if (!metas || metas.length === 0) return;

  const { data: ventas } = await supabase
    .from("datos_venta")
    .select("codigo_representante, volumen_cajas, ventas_cop")
    .eq("mes", mesActual)
    .eq("ano", anoActual);

  const ventasByRep = new Map<string, { volumen: number; ventas: number }>();
  for (const v of (ventas || [])) {
    const rep = v.codigo_representante || "";
    const existing = ventasByRep.get(rep) || { volumen: 0, ventas: 0 };
    existing.volumen += v.volumen_cajas || 0;
    existing.ventas += v.ventas_cop || 0;
    ventasByRep.set(rep, existing);
  }

  const resumen: string[] = [];
  let totalCumplimiento = 0;

  for (const meta of metas) {
    const real = ventasByRep.get(meta.codigo_representante) || { volumen: 0, ventas: 0 };
    const cumplimiento = meta.meta_volumen_cajas > 0
      ? (real.volumen / meta.meta_volumen_cajas) * 100 : 0;
    totalCumplimiento += cumplimiento;
    resumen.push(`${meta.codigo_representante}: ${cumplimiento.toFixed(0)}% volumen`);
  }

  const promedio = metas.length > 0 ? totalCumplimiento / metas.length : 0;

  await supabase.from("notificaciones").insert({
    usuario_id: userId,
    tipo: "rendimiento_equipo",
    titulo: `Resumen diario — ${mesActual} ${anoActual}`,
    mensaje: `Cumplimiento promedio del equipo: ${promedio.toFixed(0)}%. ${resumen.join(" | ")}`,
    metadata: { mes: mesActual, ano: anoActual, promedio_cumplimiento: promedio },
  });

  generated.push("rendimiento_equipo");
}

async function generateVisitasPendientesEquipo(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  generated: string[]
) {
  const { data: reps } = await supabase
    .from("usuarios")
    .select("codigo_representante, nombre_completo")
    .eq("rol", "REPRESENTANTE")
    .eq("activo", true);

  if (!reps || reps.length === 0) return;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_THRESHOLD);

  const repsSinVisitar: string[] = [];

  for (const rep of reps) {
    if (!rep.codigo_representante) continue;

    const { data: clientes } = await supabase
      .from("clientes")
      .select("id")
      .eq("codigo_representante", rep.codigo_representante)
      .eq("activo", true);

    if (!clientes || clientes.length === 0) continue;

    let pendientes = 0;
    for (const cliente of clientes.slice(0, 20)) {
      const { data: ultimaVisita } = await supabase
        .from("visitas")
        .select("fecha_visita")
        .eq("cliente_id", cliente.id)
        .order("fecha_visita", { ascending: false })
        .limit(1)
        .single();

      if (!ultimaVisita || new Date(ultimaVisita.fecha_visita) < cutoffDate) {
        pendientes++;
      }
    }

    if (pendientes > 0) {
      repsSinVisitar.push(`${rep.nombre_completo || rep.codigo_representante} (${pendientes})`);
    }
  }

  if (repsSinVisitar.length === 0) return;

  const today = new Date().toISOString().split("T")[0];
  const { data: existing } = await supabase
    .from("notificaciones")
    .select("id")
    .eq("usuario_id", userId)
    .eq("tipo", "visita_pendiente")
    .gte("created_at", `${today}T00:00:00`)
    .containedBy("metadata", { scope: "equipo" })
    .limit(1);

  if (existing && existing.length > 0) return;

  await supabase.from("notificaciones").insert({
    usuario_id: userId,
    tipo: "visita_pendiente",
    titulo: "Visitas pendientes del equipo",
    mensaje: `Representantes con clientes sin visitar (+${DAYS_THRESHOLD} días): ${repsSinVisitar.join(", ")}`,
    metadata: { scope: "equipo" },
  });

  generated.push("visitas_equipo");
}
