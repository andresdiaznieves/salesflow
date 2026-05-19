import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateInsightsWithClaude, type ClientInsightData } from "@/lib/claude-api";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { codigo_cliente, force_refresh } = body;

  if (!codigo_cliente) {
    return NextResponse.json({ error: "codigo_cliente requerido" }, { status: 400 });
  }

  if (!force_refresh) {
    const { data: cached } = await supabase
      .from("insights_cache")
      .select("*")
      .eq("codigo_cliente", codigo_cliente)
      .single();

    if (cached) {
      const age = Date.now() - new Date(cached.generated_at).getTime();
      const ONE_DAY = 24 * 60 * 60 * 1000;
      if (age < ONE_DAY) {
        return NextResponse.json({ insights: cached.insights, source: cached.source, cached: true });
      }
    }
  }

  const { data: cliente } = await supabase
    .from("clientes")
    .select("*")
    .eq("codigo_cliente", codigo_cliente)
    .single();

  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  const { data: ventas } = await supabase
    .from("datos_venta")
    .select("*")
    .eq("codigo_cliente", codigo_cliente);

  if (!ventas || ventas.length === 0) {
    return NextResponse.json({ error: "Sin datos de venta para este cliente" }, { status: 404 });
  }

  const marcasMap = new Map<string, { volumen: number; ventas: number; margen_sum: number; sell_out_sum: number; count: number }>();
  const mesesMap = new Map<string, number>();
  let totalVolumen = 0;
  let totalVentas = 0;
  let totalMargen = 0;
  let totalSellOut = 0;
  let totalEventos = 0;

  for (const v of ventas) {
    totalVolumen += v.volumen_cajas || 0;
    totalVentas += v.ventas_cop || 0;
    totalMargen += v.margen_porcentaje || 0;
    totalSellOut += v.sell_out || 0;
    totalEventos += v.eventos_ejecutados || 0;

    const marca = v.marca || "Sin marca";
    const existing = marcasMap.get(marca) || { volumen: 0, ventas: 0, margen_sum: 0, sell_out_sum: 0, count: 0 };
    existing.volumen += v.volumen_cajas || 0;
    existing.ventas += v.ventas_cop || 0;
    existing.margen_sum += v.margen_porcentaje || 0;
    existing.sell_out_sum += v.sell_out || 0;
    existing.count += 1;
    marcasMap.set(marca, existing);

    const mes = v.mes || "Desconocido";
    mesesMap.set(mes, (mesesMap.get(mes) || 0) + (v.volumen_cajas || 0));
  }

  const marcas = Array.from(marcasMap.entries())
    .map(([marca, d]) => ({
      marca,
      volumen: d.volumen,
      porcentaje_mix: totalVolumen > 0 ? (d.volumen / totalVolumen) * 100 : 0,
      margen: d.count > 0 ? d.margen_sum / d.count : 0,
      sell_out: d.count > 0 ? d.sell_out_sum / d.count : 0,
    }))
    .sort((a, b) => b.volumen - a.volumen);

  const mesesOrder = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const tendencia = Array.from(mesesMap.entries())
    .sort((a, b) => mesesOrder.indexOf(a[0]) - mesesOrder.indexOf(b[0]))
    .map(([mes, volumen]) => ({ mes, volumen }));

  const clientData: ClientInsightData = {
    nombre_cliente: cliente.nombre || cliente.codigo_cliente,
    codigo_cliente: cliente.codigo_cliente,
    segmento: cliente.segmento,
    tipo_negocio: cliente.tipo_negocio,
    ciudad: cliente.ciudad,
    volumen_total_cajas: totalVolumen,
    ventas_total_cop: totalVentas,
    margen_promedio: ventas.length > 0 ? totalMargen / ventas.length : 0,
    sell_out_promedio: ventas.length > 0 ? totalSellOut / ventas.length : 0,
    eventos_ejecutados: totalEventos,
    marcas,
    tendencia_mensual: tendencia,
  };

  const insights = await generateInsightsWithClaude(clientData);
  const source = process.env.ANTHROPIC_API_KEY ? "claude" : "fallback";

  await supabase
    .from("insights_cache")
    .upsert({
      codigo_cliente,
      insights,
      generated_at: new Date().toISOString(),
      source,
    }, { onConflict: "codigo_cliente" });

  return NextResponse.json({ insights, source, cached: false });
}
