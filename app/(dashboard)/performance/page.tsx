"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { useUser } from "@/hooks/use-user";
import { KPICard } from "@/components/dashboard/kpi-card";
import { GaugeChart } from "@/components/dashboard/gauge-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { Package, DollarSign, Target, TrendingUp, BarChart3 } from "lucide-react";
import type { DatoVenta, MetaMensual } from "@/types";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const BAR_COLORS = ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444", "#EC4899", "#06B6D4", "#F97316"];

export default function PerformancePage() {
  const { usuario, isSupervisor } = useUser();
  const [ventas, setVentas] = useState<DatoVenta[]>([]);
  const [metas, setMetas] = useState<MetaMensual[]>([]);
  const [reps, setReps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedRep, setSelectedRep] = useState("todos");
  const [selectedMes, setSelectedMes] = useState(() => MESES[new Date().getMonth()]);
  const [selectedAno] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!usuario) return;
    async function fetchData() {
      const supabase = createClient();
      const [ventasData, metasRes] = await Promise.all([
        fetchAllRows<DatoVenta>("datos_venta"),
        supabase.from("metas_mensuales").select("*"),
      ]);
      setVentas(ventasData);
      setMetas(metasRes.data || []);

      const uniqueReps = [...new Set(
        ventasData.map((v) => v.codigo_representante).filter(Boolean)
      )].sort() as string[];
      setReps(uniqueReps);

      if (!isSupervisor && usuario?.codigo_representante) {
        setSelectedRep(usuario.codigo_representante);
      }

      setLoading(false);
    }
    fetchData();
  }, [usuario, isSupervisor]);

  // Filtered ventas for selected rep/mes
  const filteredVentas = useMemo(() => {
    let result = ventas.filter((v) => v.mes === selectedMes && v.ano === selectedAno);
    if (selectedRep !== "todos") {
      result = result.filter((v) => v.codigo_representante === selectedRep);
    }
    return result;
  }, [ventas, selectedRep, selectedMes, selectedAno]);

  // Find matching meta
  const meta = useMemo(() => {
    if (selectedRep === "todos") return null;
    return metas.find(
      (m) => m.codigo_representante === selectedRep && m.mes === selectedMes && m.ano === selectedAno
    ) || null;
  }, [metas, selectedRep, selectedMes, selectedAno]);

  // Actual values
  const actualVolumen = filteredVentas.reduce((s, v) => s + v.volumen_cajas, 0);
  const actualVentas = filteredVentas.reduce((s, v) => s + v.ventas_cop, 0);
  const actualMargen = filteredVentas.length > 0
    ? filteredVentas.reduce((s, v) => s + v.margen_porcentaje, 0) / filteredVentas.length : 0;
  const actualEventos = filteredVentas.reduce((s, v) => s + v.eventos_ejecutados, 0);

  // Brand fulfillment
  const brandData = useMemo(() => {
    const brandMap = new Map<string, number>();
    for (const v of filteredVentas) {
      brandMap.set(v.marca, (brandMap.get(v.marca) || 0) + v.volumen_cajas);
    }
    return Array.from(brandMap.entries())
      .map(([marca, actual]) => {
        const metaMarca = meta?.metas_por_marca?.[marca] || 0;
        return {
          marca,
          actual,
          meta: metaMarca,
          cumplimiento: metaMarca > 0 ? (actual / metaMarca) * 100 : 0,
        };
      })
      .sort((a, b) => b.actual - a.actual);
  }, [filteredVentas, meta]);

  // Rep comparison (supervisor view)
  const repComparison = useMemo(() => {
    if (selectedRep !== "todos") return [];
    const repMap = new Map<string, number>();
    const repVentas = ventas.filter((v) => v.mes === selectedMes && v.ano === selectedAno);
    for (const v of repVentas) {
      if (v.codigo_representante) {
        repMap.set(v.codigo_representante, (repMap.get(v.codigo_representante) || 0) + v.volumen_cajas);
      }
    }
    return Array.from(repMap.entries())
      .map(([rep, volumen]) => {
        const repMeta = metas.find(
          (m) => m.codigo_representante === rep && m.mes === selectedMes && m.ano === selectedAno
        );
        return {
          rep,
          volumen,
          meta: repMeta?.meta_volumen_cajas || 0,
          cumplimiento: repMeta && repMeta.meta_volumen_cajas > 0
            ? (volumen / repMeta.meta_volumen_cajas) * 100 : 0,
        };
      })
      .sort((a, b) => b.cumplimiento - a.cumplimiento);
  }, [ventas, metas, selectedRep, selectedMes, selectedAno]);

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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Performance</h1>
        <p className="text-sm text-muted-foreground">
          Cumplimiento de metas y análisis de rendimiento
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {isSupervisor && (
          <Select value={selectedRep} onValueChange={(v) => v && setSelectedRep(v)}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Representante" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todo el equipo</SelectItem>
              {reps.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={selectedMes} onValueChange={(v) => v && setSelectedMes(v)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MESES.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Individual rep view */}
      {selectedRep !== "todos" && (
        <>
          {meta ? (
            <>
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-4 flex flex-col items-center">
                    <GaugeChart
                      value={actualVolumen}
                      max={meta.meta_volumen_cajas}
                      label="Cumplimiento Volumen"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {actualVolumen.toLocaleString()} / {meta.meta_volumen_cajas.toLocaleString()} cajas
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex flex-col items-center">
                    <GaugeChart
                      value={actualVentas}
                      max={meta.meta_ventas_cop}
                      label="Cumplimiento Ventas"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCOP(actualVentas)} / {formatCOP(meta.meta_ventas_cop)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex flex-col items-center">
                    <GaugeChart
                      value={actualMargen}
                      max={meta.meta_margen_porcentaje}
                      label="Cumplimiento Margen"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {actualMargen.toFixed(1)}% / {meta.meta_margen_porcentaje}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex flex-col items-center">
                    <GaugeChart
                      value={actualEventos}
                      max={meta.meta_eventos}
                      label="Cumplimiento Eventos"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {actualEventos} / {meta.meta_eventos} eventos
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <KPICard
                  title="Faltan"
                  value={Math.max(0, meta.meta_volumen_cajas - actualVolumen).toLocaleString()}
                  subtitle="cajas para la meta"
                  icon={Package}
                />
                <KPICard
                  title="Faltan"
                  value={formatCOP(Math.max(0, meta.meta_ventas_cop - actualVentas))}
                  subtitle="COP para la meta"
                  icon={DollarSign}
                />
                <KPICard
                  title="Meta Volumen"
                  value={meta.meta_volumen_cajas.toLocaleString()}
                  subtitle="cajas totales"
                  icon={Target}
                />
                <KPICard
                  title="Alcanzado"
                  value={`${meta.meta_volumen_cajas > 0 ? ((actualVolumen / meta.meta_volumen_cajas) * 100).toFixed(1) : 0}%`}
                  subtitle="del objetivo"
                  icon={TrendingUp}
                />
              </div>

              {/* Brand fulfillment */}
              {brandData.length > 0 && Object.keys(meta.metas_por_marca || {}).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Cumplimiento por Marca</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-2 font-medium">Marca</th>
                            <th className="pb-2 font-medium text-right">Meta</th>
                            <th className="pb-2 font-medium text-right">Actual</th>
                            <th className="pb-2 font-medium text-right">Faltan</th>
                            <th className="pb-2 font-medium text-right">Cumplimiento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {brandData.map((b) => (
                            <tr key={b.marca} className="border-b last:border-0">
                              <td className="py-2.5 font-medium">{b.marca}</td>
                              <td className="py-2.5 text-right">{b.meta.toLocaleString()}</td>
                              <td className="py-2.5 text-right">{b.actual.toLocaleString()}</td>
                              <td className="py-2.5 text-right">
                                {Math.max(0, b.meta - b.actual).toLocaleString()}
                              </td>
                              <td className="py-2.5 text-right">
                                {b.meta > 0 ? (
                                  <Badge
                                    className="text-xs"
                                    variant={b.cumplimiento >= 100 ? "default" : b.cumplimiento >= 70 ? "secondary" : "destructive"}
                                  >
                                    {b.cumplimiento.toFixed(1)}%
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Target className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  No hay meta definida para {selectedRep} en {selectedMes} {selectedAno}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ve a Metas para crear una
                </p>
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mt-6">
                  <KPICard title="Volumen" value={actualVolumen.toLocaleString()} subtitle="cajas" icon={Package} />
                  <KPICard title="Ventas" value={formatCOP(actualVentas)} subtitle="COP" icon={DollarSign} />
                  <KPICard title="Margen" value={`${actualMargen.toFixed(1)}%`} icon={TrendingUp} />
                  <KPICard title="Eventos" value={actualEventos} subtitle="ejecutados" icon={BarChart3} />
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Team comparison (supervisor) */}
      {selectedRep === "todos" && repComparison.length > 0 && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ranking del Equipo — {selectedMes} {selectedAno}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={repComparison} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="rep" tick={{ fontSize: 11, fill: "#6B7280" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(value, name) => [
                        `${Number(value).toLocaleString()} cajas`,
                        String(name) === "volumen" ? "Actual" : "Meta",
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="volumen" name="Actual" radius={[4, 4, 0, 0]}>
                      {repComparison.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                    <Bar dataKey="meta" name="Meta" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Detalle por Representante</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">Representante</th>
                      <th className="pb-2 font-medium text-right">Volumen</th>
                      <th className="pb-2 font-medium text-right">Meta</th>
                      <th className="pb-2 font-medium text-right">Cumplimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repComparison.map((r, i) => (
                      <tr key={r.rep} className="border-b last:border-0">
                        <td className="py-2.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {i + 1}
                          </span>
                        </td>
                        <td className="py-2.5 font-medium">{r.rep}</td>
                        <td className="py-2.5 text-right">{r.volumen.toLocaleString()}</td>
                        <td className="py-2.5 text-right">
                          {r.meta > 0 ? r.meta.toLocaleString() : "—"}
                        </td>
                        <td className="py-2.5 text-right">
                          {r.meta > 0 ? (
                            <Badge
                              variant={r.cumplimiento >= 100 ? "default" : r.cumplimiento >= 70 ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              {r.cumplimiento.toFixed(1)}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">Sin meta</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
