"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TopClient {
  codigo_cliente: string;
  nombre_negocio: string;
  volumen_total: number;
  ventas_total: number;
  ciudad?: string;
}

interface TopClientsTableProps {
  clients: TopClient[];
  title?: string;
}

export function TopClientsTable({
  clients,
  title = "Top Clientes por Volumen",
}: TopClientsTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Sin datos disponibles
          </p>
        ) : (
          <div className="space-y-3">
            {clients.map((client, i) => (
              <div
                key={client.codigo_cliente}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{client.nombre_negocio}</p>
                    <p className="text-xs text-muted-foreground">
                      {client.codigo_cliente}
                      {client.ciudad ? ` · ${client.ciudad}` : ""}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {client.volumen_total.toLocaleString()} cajas
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
