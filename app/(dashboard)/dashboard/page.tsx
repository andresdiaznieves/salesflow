"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { useUser } from "@/hooks/use-user";
import { KPICard } from "@/components/dashboard/kpi-card";
import { VolumeChart } from "@/components/dashboard/volume-chart";
import { TopClientsTable } from "@/components/dashboard/top-clients-table";
import { BrandPieChart } from "@/components/dashboard/brand-pie-chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  DollarSign,
  TrendingUp,
  Users,
  BarChart3,
  Percent,
  Filter,
} from "lucide-react";
import type { DatoVenta } from "@/types";

const MES_ORDER: Record<string, number> = {
  Enero: 1, Febrero: 2, Marzo: 3, Abril: 4, Mayo: 5, Junio: 6,
  Julio: 7, Agosto: 8, Septiembre: 9, Octubre: 10, Noviembre: 11, Diciembre: 12,
};

export default function DashboardPage() {
  const { usuario, isSupervisor } = useUser();
  const [allVentas, setAllVentas] = useState<DatoVenta[]>([]);
  const [clientes, setClientes] = useState<
    Array<{ codigo_cliente: string; nombre_negocio: string; ciudad?: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [marcaFilter, setMarcaFilter] = useState("todas");
  const [mesFilter, setMesFilter] = useState("todos");
  const [repFilter, setRepFilter] = useState("todos");

  useEffect(() => {
    if (!usuario) return;
    async function fetchData() {
      const supabase = createClient();
      const [ventas, clientesRes] = await Promise.all([
        fetchAllRows<DatoVenta>("datos_venta"),
        supabase.from("clientes").select("codigo_cliente, nombre_negocio, ciudad").eq("activo", true),
      ]);
      setAllVentas(ventas);
      setClientes(clientesRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, [usuario]);

  // Unique values for filter dropdowns
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
  const representantes = useMemo(
    () =>
      [...new Set(allVentas.map((v) => v.codigo_representante).filter(Boolean))]
        .sort() as string[],
    [allVentas]
  );

  // Filtered data
  const ventas = useMemo(() => {
    let result = allVentas;
    if (marcaFilter !== "todas") result = result.filter((v) => v.marca === marcaFilter);
    if (mesFilter !== "todos") result = result.filter((v) => v.mes === mesFilter);
    if (repFilter !== "todos") result = result.filter((v) => v.codigo_representante === repFilter);
    return result;
  }, [allVentas, marcaFilter, mesFilter, repFilter]);

  const activeFilters = [marcaFilter !== "todas", mesFilter !== "todos", repFilter !== "todos"].filter(Boolean).length;

  // Computed dashboard data
  const data = useMemo(() => {
    if (ventas.length === 0) {
      return {
        totalVolumen: 0, totalVentas: 0, margenPromedio: 0,
        sellOutPromedio: 0, totalEventos: 0,
        volumeByMonth: [] as Array<{ mes: string; volumen: number; ventas: number }>,
        topClients: [] as Array<{ codigo_cliente: string; nombre_negocio: string; volumen_total: number; ventas_total: number; ciudad?: string }>,
        brandMix: [] as Array<{ marca: string; volumen: number }>,
      };
    }

    const totalVolumen = ventas.reduce((s, v) => s + (v.volumen_cajas || 0), 0);
    const totalVentas = ventas.reduce((s, v) => s + (v.ventas_cop || 0), 0);
    const margenPromedio = ventas.reduce((s, v) => s + (v.margen_porcentaje || 0), 0) / ventas.length;
    const sellOutPromedio = ventas.reduce((s, v) => s + (v.sell_out_porcentaje || 0), 0) / ventas.length;
    const totalEventos = ventas.reduce((s, v) => s + (v.eventos_ejecutados || 0), 0);

    const monthMap = new Map<string, { volumen: number; ventas: number }>();
    for (const v of ventas) {
      const existing = monthMap.get(v.mes) || { volumen: 0, ventas: 0 };
      existing.volumen += v.volumen_cajas || 0;
      existing.ventas += v.ventas_cop || 0;
      monthMap.set(v.mes, existing);
    }
    const volumeByMonth = Array.from(monthMap.entries())
      .map(([mes, vals]) => ({ mes, ...vals }))
      .sort((a, b) => (MES_ORDER[a.mes] || 0) - (MES_ORDER[b.mes] || 0));

    const clientVolMap = new Map<string, { volumen_total: number; ventas_total: number }>();
    for (const v of ventas) {
      const existing = clientVolMap.get(v.codigo_cliente) || { volumen_total: 0, ventas_total: 0 };
      existing.volumen_total += v.volumen_cajas || 0;
      existing.ventas_total += v.ventas_cop || 0;
      clientVolMap.set(v.codigo_cliente, existing);
    }
    const clienteMap = new Map(clientes.map((c) => [c.codigo_cliente, c]));
    const topClients = Array.from(clientVolMap.entries())
      .map(([codigo, vals]) => ({
        codigo_cliente: codigo,
        nombre_negocio: clienteMap.get(codigo)?.nombre_negocio || `Cliente ${codigo}`,
        ciudad: clienteMap.get(codigo)?.ciudad,
        ...vals,
      }))
      .sort((a, b) => b.volumen_total - a.volumen_total)
      .slice(0, 5);

    const brandMap = new Map<string, number>();
    for (const v of ventas) {
      brandMap.set(v.marca, (brandMap.get(v.marca) || 0) + (v.volumen_cajas || 0));
    }
    const brandMix = Array.from(brandMap.entries())
      .map(([marca, volumen]) => ({ marca, volumen }))
      .sort((a, b) => b.volumen - a.volumen);

    return { totalVolumen, totalVentas, margenPromedio, sellOutPromedio, totalEventos, volumeByMonth, topClients, brandMix };
  }, [ventas, clientes]);

  // Trend: compare selected month vs previous month (uses allVentas to get previous month data)
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
      if (repFilter !== "todos") {
        currentData = currentData.filter((v) => v.codigo_representante === repFilter);
        prevData = prevData.filter((v) => v.codigo_representante === repFilter);
      }

      const currentVol = currentData.reduce((s, v) => s + (v.volumen_cajas || 0), 0);
      const prevVol = prevData.reduce((s, v) => s + (v.volumen_cajas || 0), 0);

      if (prevVol === 0) return null;
      return { value: ((currentVol - prevVol) / prevVol) * 100, label: `vs ${prevMes}` };
    }

    // No month filter: compare last two available months
    if (data.volumeByMonth.length >= 2) {
      const last = data.volumeByMonth[data.volumeByMonth.length - 1];
      const prev = data.volumeByMonth[data.volumeByMonth.length - 2];
      if (prev.volumen === 0) return null;
      return { value: ((last.volumen - prev.volumen) / prev.volumen) * 100, label: `vs ${prev.mes}` };
    }
    return null;
  }, [mesFilter, marcaFilter, repFilter, allVentas, data.volumeByMonth]);

  function formatCOP(value: number) {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value}`;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-80 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {isSupervisor
              ? "Resumen consolidado del equipo"
              : `Resumen de ${usuario?.nombre_completo}`}
          </p>
        </div>
        {activeFilters > 0 && (
          <Badge variant="secondary" className="w-fit gap-1">
            <Filter className="h-3 w-3" />
            {activeFilters} filtro{activeFilters > 1 ? "s" : ""} activo{activeFilters > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
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

        {isSupervisor && representantes.length > 1 && (
          <Select value={repFilter} onValueChange={(v) => v && setRepFilter(v)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Representante" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los reps</SelectItem>
              {representantes.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {activeFilters > 0 && (
          <button
            onClick={() => { setMarcaFilter("todas"); setMesFilter("todos"); setRepFilter("todos"); }}
            className="text-sm text-primary hover:underline whitespace-nowrap self-center"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard title="Volumen Total" value={data.totalVolumen.toLocaleString()} subtitle="cajas" icon={Package} trend={volumenTrend || undefined} />
        <KPICard title="Ventas Totales" value={formatCOP(data.totalVentas)} subtitle="COP" icon={DollarSign} />
        <KPICard title="Margen Promedio" value={`${data.margenPromedio.toFixed(1)}%`} icon={TrendingUp} />
        <KPICard title="Clientes" value={clientes.length} subtitle="activos" icon={Users} />
        <KPICard title="Sell Out" value={`${data.sellOutPromedio.toFixed(1)}%`} subtitle="promedio" icon={Percent} />
        <KPICard title="Eventos" value={data.totalEventos} subtitle="ejecutados" icon={BarChart3} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <VolumeChart data={data.volumeByMonth} title="Volumen por Mes (Cajas)" />
        <BrandPieChart data={data.brandMix} />
      </div>

      <TopClientsTable clients={data.topClients} />
    </div>
  );
}
