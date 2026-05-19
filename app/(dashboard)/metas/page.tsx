"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit2, Target } from "lucide-react";
import type { MetaMensual } from "@/types";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function MetasPage() {
  const { isSupervisor } = useUser();
  const [metas, setMetas] = useState<MetaMensual[]>([]);
  const [reps, setReps] = useState<string[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<MetaMensual | null>(null);

  // Form state
  const [formRep, setFormRep] = useState("");
  const [formMes, setFormMes] = useState("");
  const [formAno, setFormAno] = useState(String(new Date().getFullYear()));
  const [formVolumen, setFormVolumen] = useState("");
  const [formVentas, setFormVentas] = useState("");
  const [formMargen, setFormMargen] = useState("");
  const [formEventos, setFormEventos] = useState("");
  const [formMarcas, setFormMarcas] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterMes, setFilterMes] = useState("todos");
  const [filterRep, setFilterRep] = useState("todos");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const supabase = createClient();

    const [metasRes, ventasRes] = await Promise.all([
      supabase.from("metas_mensuales").select("*").order("ano", { ascending: false }),
      supabase.from("datos_venta").select("codigo_representante, marca"),
    ]);

    setMetas(metasRes.data || []);

    const uniqueReps = [...new Set(
      (ventasRes.data || []).map((v) => v.codigo_representante).filter(Boolean)
    )].sort() as string[];
    const uniqueMarcas = [...new Set(
      (ventasRes.data || []).map((v) => v.marca).filter(Boolean)
    )].sort() as string[];

    setReps(uniqueReps);
    setMarcas(uniqueMarcas);
    setLoading(false);
  }

  function openCreate() {
    setEditingMeta(null);
    setFormRep(reps[0] || "");
    setFormMes(MESES[new Date().getMonth()]);
    setFormAno(String(new Date().getFullYear()));
    setFormVolumen("");
    setFormVentas("");
    setFormMargen("");
    setFormEventos("");
    setFormMarcas({});
    setDialogOpen(true);
  }

  function openEdit(meta: MetaMensual) {
    setEditingMeta(meta);
    setFormRep(meta.codigo_representante);
    setFormMes(meta.mes);
    setFormAno(String(meta.ano));
    setFormVolumen(String(meta.meta_volumen_cajas));
    setFormVentas(String(meta.meta_ventas_cop));
    setFormMargen(String(meta.meta_margen_porcentaje));
    setFormEventos(String(meta.meta_eventos));
    setFormMarcas(
      Object.fromEntries(
        Object.entries(meta.metas_por_marca || {}).map(([k, v]) => [k, String(v)])
      )
    );
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    const record = {
      codigo_representante: formRep,
      mes: formMes,
      ano: parseInt(formAno),
      meta_volumen_cajas: parseInt(formVolumen) || 0,
      meta_ventas_cop: parseInt(formVentas) || 0,
      meta_margen_porcentaje: parseFloat(formMargen) || 0,
      meta_eventos: parseInt(formEventos) || 0,
      metas_por_marca: Object.fromEntries(
        Object.entries(formMarcas)
          .filter(([, v]) => v && parseInt(v) > 0)
          .map(([k, v]) => [k, parseInt(v)])
      ),
    };

    if (editingMeta) {
      await supabase.from("metas_mensuales").update(record).eq("id", editingMeta.id);
    } else {
      await supabase.from("metas_mensuales").upsert(record, {
        onConflict: "codigo_representante,mes,ano",
      });
    }

    setSaving(false);
    setDialogOpen(false);
    fetchData();
  }

  const filteredMetas = metas.filter((m) => {
    if (filterMes !== "todos" && m.mes !== filterMes) return false;
    if (filterRep !== "todos" && m.codigo_representante !== filterRep) return false;
    return true;
  });

  if (!isSupervisor) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Solo el supervisor puede gestionar metas</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Metas Mensuales</h1>
          <p className="text-sm text-muted-foreground">
            Define las metas de cada representante por mes
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1">
          <Plus className="h-4 w-4" />
          Nueva Meta
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMeta ? "Editar Meta" : "Nueva Meta Mensual"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Representante</Label>
                  <Select value={formRep} onValueChange={(v) => v && setFormRep(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {reps.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Mes</Label>
                  <Select value={formMes} onValueChange={(v) => v && setFormMes(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MESES.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Año</Label>
                  <Input value={formAno} onChange={(e) => setFormAno(e.target.value)} type="number" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Meta Volumen (cajas)</Label>
                  <Input value={formVolumen} onChange={(e) => setFormVolumen(e.target.value)} type="number" placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Meta Ventas (COP)</Label>
                  <Input value={formVentas} onChange={(e) => setFormVentas(e.target.value)} type="number" placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Meta Margen (%)</Label>
                  <Input value={formMargen} onChange={(e) => setFormMargen(e.target.value)} type="number" step="0.1" placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Meta Eventos</Label>
                  <Input value={formEventos} onChange={(e) => setFormEventos(e.target.value)} type="number" placeholder="0" />
                </div>
              </div>

              {marcas.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Metas por Marca (cajas)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {marcas.map((marca) => (
                      <div key={marca} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-28 truncate">{marca}</span>
                        <Input
                          value={formMarcas[marca] || ""}
                          onChange={(e) =>
                            setFormMarcas((prev) => ({ ...prev, [marca]: e.target.value }))
                          }
                          type="number"
                          placeholder="0"
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleSave} disabled={saving || !formRep || !formMes} className="w-full">
                {saving ? "Guardando..." : editingMeta ? "Guardar Cambios" : "Crear Meta"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <Select value={filterRep} onValueChange={(v) => v && setFilterRep(v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Representante" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los reps</SelectItem>
            {reps.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterMes} onValueChange={(v) => v && setFilterMes(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los meses</SelectItem>
            {MESES.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredMetas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No hay metas definidas</p>
          <p className="text-sm">Crea la primera meta para un representante</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMetas.map((meta) => (
            <Card key={meta.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{meta.codigo_representante}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {meta.mes} {meta.ano}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-sm mt-2">
                      <div>
                        <span className="text-muted-foreground">Volumen:</span>{" "}
                        <span className="font-medium">{meta.meta_volumen_cajas.toLocaleString()} cajas</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ventas:</span>{" "}
                        <span className="font-medium">
                          ${meta.meta_ventas_cop >= 1_000_000
                            ? `${(meta.meta_ventas_cop / 1_000_000).toFixed(1)}M`
                            : meta.meta_ventas_cop.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Margen:</span>{" "}
                        <span className="font-medium">{meta.meta_margen_porcentaje}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Eventos:</span>{" "}
                        <span className="font-medium">{meta.meta_eventos}</span>
                      </div>
                    </div>
                    {meta.metas_por_marca && Object.keys(meta.metas_por_marca).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(meta.metas_por_marca).map(([marca, cajas]) => (
                          <Badge key={marca} variant="outline" className="text-xs">
                            {marca}: {Number(cajas).toLocaleString()}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(meta)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
