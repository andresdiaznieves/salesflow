"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { ClienteSearch } from "@/components/clientes/cliente-search";
import { KPICard } from "@/components/dashboard/kpi-card";
import { VolumeChart } from "@/components/dashboard/volume-chart";
import { BrandPieChart } from "@/components/dashboard/brand-pie-chart";
import { InsightCard } from "@/components/clientes/insight-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  DollarSign,
  TrendingUp,
  Percent,
  BarChart3,
  Calendar,
  Filter,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import type { Cliente, DatoVenta } from "@/types";
import type { Insight } from "@/lib/claude-api";

const MES_ORDER: Record<string, number> = {
  Enero: 1, Febrero: 2, Marzo: 3, Abril: 4, Mayo: 5, Junio: 6,
  Julio: 7, Agosto: 8, Septiembre: 9, Octubre: 10, Noviembre: 11, Diciembre: 12,
};

export default function ComportamientoPage() {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [allVentas, setAllVentas] = useState<DatoVenta[]>([]);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsSource, setInsightsSource] = useState<string>("");

  // Filters
  const [marcaFilter, setMarcaFilter] = useState("todas");
  const [mesFilter, setMesFilter] = useState("todos");

  async function handleSelectCliente(selected: Cliente) {
    setCliente(selected);
    setLoading(true);
    setMarcaFilter("todas");
    setMesFilter("todos");
    setInsights([]);

    const data = await fetchAllRows<DatoVenta>("datos_venta", "*", [
      { column: "codigo_cliente", value: selected.codigo_cliente },
    ]);

    setAllVentas(data || []);
    setLoading(false);

    if (data && data.length > 0) {
      fetchInsights(selected.codigo_cliente, false);
    }
  }

  async function fetchInsights(codigoCliente: string, forceRefresh: boolean) {
    setInsightsLoading(true);
    try {
      const res = await fetch("/api/claude/generate-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo_cliente: codigoCliente, force_refresh: forceRefresh }),
      });
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights || []);
        setInsightsSource(data.source || "");
      }
    } catch {
      // silently fail
    }
    setInsightsLoading(false);
  }

  // Unique values for filters
  const marcas = useMemo(
    () => [...new Set(allVentas.map((v) => v.marca))].sort(),
    [allVentas]
  );
  const meses = useMemo(
    () =>
      [...new Set(allVentas.map((v) => v.mes))].sort(
        (a, b) => (MES_ORDER[a] || 0) - (MES_ORDER[b] || 0)
      ),
    [allVentas]
  );

  // Filtered data
  const ventas = useMemo(() => {
    let result = allVentas;
    if (marcaFilter !== "todas") result = result.filter((v) => v.marca === marcaFilter);
    if (mesFilter !== "todos") result = result.filter((v) => v.mes === mesFilter);
    return result;
  }, [allVentas, marcaFilter, mesFilter]);

  const activeFilters = [marcaFilter !== "todas", mesFilter !== "todos"].filter(Boolean).length;

  // Computed metrics
  const totalVolumen = ventas.reduce((s, v) => s + v.volumen_cajas, 0);
  const totalVentas = ventas.reduce((s, v) => s + v.ventas_cop, 0);
  const margenProm = ventas.length > 0
    ? ventas.reduce((s, v) => s + v.margen_porcentaje, 0) / ventas.length : 0;
  const sellOutProm = ventas.length > 0
    ? ventas.reduce((s, v) => s + v.sell_out_porcentaje, 0) / ventas.length : 0;
  const totalEventos = ventas.reduce((s, v) => s + v.eventos_ejecutados, 0);

  // Volume by month
  const volumeByMonth = useMemo(() => {
    const monthMap = new Map<string, { volumen: number; ventas: number }>();
    for (const v of ventas) {
      const existing = monthMap.get(v.mes) || { volumen: 0, ventas: 0 };
      existing.volumen += v.volumen_cajas;
      existing.ventas += v.ventas_cop;
      monthMap.set(v.mes, existing);
    }
    return Array.from(monthMap.entries())
      .map(([mes, vals]) => ({ mes, ...vals }))
      .sort((a, b) => (MES_ORDER[a.mes] || 0) - (MES_ORDER[b.mes] || 0));
  }, [ventas]);

  // Brand analysis
  const brandDetails = useMemo(() => {
    const brandMap = new Map<
      string,
      { volumen: number; ventas: number; margen: number; sellOut: number; count: number }
    >();
    for (const v of ventas) {
      const existing = brandMap.get(v.marca) || {
        volumen: 0, ventas: 0, margen: 0, sellOut: 0, count: 0,
      };
      existing.volumen += v.volumen_cajas;
      existing.ventas += v.ventas_cop;
      existing.margen += v.margen_porcentaje;
      existing.sellOut += v.sell_out_porcentaje;
      existing.count += 1;
      brandMap.set(v.marca, existing);
    }
    return Array.from(brandMap.entries())
      .map(([marca, vals]) => ({
        marca,
        volumen: vals.volumen,
        porcentaje: totalVolumen > 0 ? (vals.volumen / totalVolumen) * 100 : 0,
        ventas: vals.ventas,
        margen: vals.count > 0 ? vals.margen / vals.count : 0,
        sellOut: vals.count > 0 ? vals.sellOut / vals.count : 0,
      }))
      .sort((a, b) => b.volumen - a.volumen);
  }, [ventas, totalVolumen]);

  const brandPieData = brandDetails.map((b) => ({ marca: b.marca, volumen: b.volumen }));

  // Trend: compare selected month vs previous month
  const volumenTrend = useMemo(() => {
    const MES_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    if (mesFilter !== "todos") {
      const currentIdx = MES_NAMES.indexOf(mesFilter);
      if (currentIdx <= 0) return null;
      const prevMes = MES_NAMES[currentIdx - 1];

      let currentData = allVentas.filter((v) => v.mes === mesFilter);
      let prevData = allVentas.filter((v) => v.mes === prevMes);

      if (marcaFilter !== "todas") {
        currentData = currentData.filter((v) => v.marca === marcaFilter);
        prevData = prevData.filter((v) => v.marca === marcaFilter);
      }

      const currentVol = currentData.reduce((s, v) => s + v.volumen_cajas, 0);
      const prevVol = prevData.reduce((s, v) => s + v.volumen_cajas, 0);

      if (prevVol === 0) return null;
      return { value: ((currentVol - prevVol) / prevVol) * 100, label: `vs ${prevMes}` };
    }

    if (volumeByMonth.length >= 2) {
      const last = volumeByMonth[volumeByMonth.length - 1];
      const prev = volumeByMonth[volumeByMonth.length - 2];
      if (prev.volumen === 0) return null;
      return { value: ((last.volumen - prev.volumen) / prev.volumen) * 100, label: `vs ${prev.mes}` };
    }
    return null;
  }, [mesFilter, marcaFilter, allVentas, volumeByMonth]);

  function formatCOP(value: number) {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value}`;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Comportamiento del Cliente</h1>
        <p className="text-sm text-muted-foreground">
          Selecciona un cliente para ver su análisis detallado
        </p>
      </div>

      <ClienteSearch onSelect={handleSelectCliente} />

      {loading && (
        <div className="space-y-4">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {cliente && !loading && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{cliente.nombre_negocio}</h2>
                  <p className="text-sm text-muted-foreground">
                    {cliente.codigo_cliente} · {cliente.ciudad || "Sin ciudad"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {cliente.segmento && <Badge variant="secondary">Seg. {cliente.segmento}</Badge>}
                  {cliente.tipo_negocio && (
                    <Badge variant="outline">{cliente.tipo_negocio.replace("_", " ")}</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {allVentas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay datos de venta para este cliente</p>
              <p className="text-sm">Importa datos desde el módulo de importación</p>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  Filtrar por:
                </div>
                <Select value={marcaFilter} onValueChange={(v) => v && setMarcaFilter(v)}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Marca" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las marcas</SelectItem>
                    {marcas.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={mesFilter} onValueChange={(v) => v && setMesFilter(v)}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Mes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los meses</SelectItem>
                    {meses.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {activeFilters > 0 && (
                  <button
                    onClick={() => { setMarcaFilter("todas"); setMesFilter("todos"); }}
                    className="text-sm text-primary hover:underline whitespace-nowrap"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>

              <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <KPICard
                  title="Volumen Total"
                  value={totalVolumen.toLocaleString()}
                  subtitle="cajas"
                  icon={Package}
                  trend={volumenTrend || undefined}
                />
                <KPICard title="Ventas Totales" value={formatCOP(totalVentas)} subtitle="COP" icon={DollarSign} />
                <KPICard title="Margen Promedio" value={`${margenProm.toFixed(1)}%`} icon={TrendingUp} />
                <KPICard title="Sell Out" value={`${sellOutProm.toFixed(1)}%`} subtitle="promedio" icon={Percent} />
                <KPICard title="Eventos" value={totalEventos} subtitle="ejecutados" icon={Calendar} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <VolumeChart data={volumeByMonth} title="Volumen Mensual (Cajas)" />
                <BrandPieChart data={brandPieData} title="Mix de Marcas" />
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Detalle por Marca</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 font-medium">Marca</th>
                          <th className="pb-2 font-medium text-right">Cajas</th>
                          <th className="pb-2 font-medium text-right">% Mix</th>
                          <th className="pb-2 font-medium text-right">Ventas</th>
                          <th className="pb-2 font-medium text-right">Margen</th>
                          <th className="pb-2 font-medium text-right">Sell Out</th>
                        </tr>
                      </thead>
                      <tbody>
                        {brandDetails.map((brand) => (
                          <tr key={brand.marca} className="border-b last:border-0">
                            <td className="py-2.5 font-medium">{brand.marca}</td>
                            <td className="py-2.5 text-right">{brand.volumen.toLocaleString()}</td>
                            <td className="py-2.5 text-right">{brand.porcentaje.toFixed(1)}%</td>
                            <td className="py-2.5 text-right">{formatCOP(brand.ventas)}</td>
                            <td className="py-2.5 text-right">{brand.margen.toFixed(1)}%</td>
                            <td className="py-2.5 text-right">{brand.sellOut.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* AI Insights Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Insights Accionables</h3>
                    {insightsSource && (
                      <Badge variant="outline" className="text-[10px]">
                        {insightsSource === "claude" ? "IA" : "Análisis automático"}
                      </Badge>
                    )}
                  </div>
                  {insights.length > 0 && cliente && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs"
                      disabled={insightsLoading}
                      onClick={() => fetchInsights(cliente.codigo_cliente, true)}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${insightsLoading ? "animate-spin" : ""}`} />
                      Regenerar
                    </Button>
                  )}
                </div>

                {insightsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : insights.length > 0 ? (
                  <div className="space-y-3">
                    {insights.map((insight, i) => (
                      <InsightCard key={i} insight={insight} />
                    ))}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
