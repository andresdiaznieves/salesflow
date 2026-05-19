"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, MapPin, Phone, Store, Edit2 } from "lucide-react";
import { VisitaForm } from "@/components/clientes/visita-form";
import { EditVisitaForm } from "@/components/clientes/edit-visita-form";
import type { Cliente, Visita } from "@/types";

export default function ClienteHistorialPage() {
  const params = useParams();
  const router = useRouter();
  const { usuario } = useUser();
  const clienteId = params.clienteId as string;

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVisita, setEditingVisita] = useState<string | null>(null);

  async function fetchData() {
    const supabase = createClient();

    const { data: clienteData } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", clienteId)
      .single();

    const { data: visitasData } = await supabase
      .from("visitas")
      .select("*, usuario:usuarios(nombre_completo, rol)")
      .eq("cliente_id", clienteId)
      .order("fecha_visita", { ascending: false });

    setCliente(clienteData);
    setVisitas(visitasData || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [clienteId]);

  function handleVisitaCreated() {
    setShowForm(false);
    fetchData();
  }

  function handleVisitaUpdated() {
    setEditingVisita(null);
    fetchData();
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        <div className="h-40 bg-muted rounded-xl animate-pulse" />
        <div className="h-24 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cliente no encontrado</p>
        <Button variant="link" onClick={() => router.push("/")}>
          Volver a clientes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/")}
        className="gap-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Button>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{cliente.nombre_negocio}</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {cliente.codigo_cliente}
              </p>
            </div>
            <div className="flex gap-2">
              {cliente.segmento && (
                <Badge variant="secondary">Seg. {cliente.segmento}</Badge>
              )}
              {cliente.tipo_negocio && (
                <Badge variant="outline">
                  <Store className="h-3 w-3 mr-1" />
                  {cliente.tipo_negocio.replace("_", " ")}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {cliente.nombre_dueno && (
            <p>
              <span className="text-muted-foreground">Dueño:</span>{" "}
              {cliente.nombre_dueno}
            </p>
          )}
          {(cliente.direccion || cliente.barrio) && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>
                {[cliente.direccion, cliente.barrio, cliente.ciudad]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
          )}
          {cliente.telefono && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              {cliente.telefono}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Historial de Visitas ({visitas.length})
        </h2>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1">
          <Plus className="h-4 w-4" />
          Nueva Visita
        </Button>
      </div>

      {showForm && (
        <VisitaForm
          clienteId={clienteId}
          onSuccess={handleVisitaCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      {visitas.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No hay visitas registradas</p>
          <p className="text-sm">Registra la primera visita a este cliente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visitas.map((visita) => (
            <Card key={visita.id}>
              <CardContent className="p-4">
                {editingVisita === visita.id ? (
                  <EditVisitaForm
                    visita={visita}
                    onSuccess={handleVisitaUpdated}
                    onCancel={() => setEditingVisita(null)}
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">
                          {visita.usuario?.nombre_completo || "Usuario"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(visita.fecha_visita)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {visita.editado && (
                          <Badge variant="outline" className="text-xs">
                            Editado
                          </Badge>
                        )}
                        {visita.usuario_id === usuario?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingVisita(visita.id)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">
                      {visita.comentario}
                    </p>
                    {visita.editado && visita.fecha_edicion && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Editado: {formatDate(visita.fecha_edicion)}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
