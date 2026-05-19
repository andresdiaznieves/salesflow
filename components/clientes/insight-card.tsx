"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, AlertTriangle } from "lucide-react";
import type { Insight } from "@/lib/claude-api";

const prioridadConfig = {
  1: { label: "Alta", variant: "destructive" as const, icon: AlertTriangle },
  2: { label: "Media", variant: "default" as const, icon: TrendingUp },
  3: { label: "Baja", variant: "secondary" as const, icon: Lightbulb },
};

export function InsightCard({ insight }: { insight: Insight }) {
  const config = prioridadConfig[insight.prioridad as 1 | 2 | 3] || prioridadConfig[3];
  const Icon = config.icon;

  return (
    <Card className="border-l-4" style={{ borderLeftColor: insight.prioridad === 1 ? "#ef4444" : insight.prioridad === 2 ? "#f59e0b" : "#60a5fa" }}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: insight.prioridad === 1 ? "#ef4444" : insight.prioridad === 2 ? "#f59e0b" : "#60a5fa" }} />
            <h4 className="font-semibold text-sm leading-tight">{insight.titulo}</h4>
          </div>
          <Badge variant={config.variant} className="text-[10px] shrink-0">
            {config.label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{insight.descripcion}</p>
        <div className="bg-accent/50 rounded-md p-2.5">
          <p className="text-xs font-medium text-foreground">Acción sugerida:</p>
          <p className="text-xs text-muted-foreground mt-0.5">{insight.accion_sugerida}</p>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Impacto estimado: <span className="font-medium text-foreground">+{insight.impacto_estimado_cajas} cajas</span></span>
        </div>
      </CardContent>
    </Card>
  );
}
