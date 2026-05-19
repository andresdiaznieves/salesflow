"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

interface VisitaFormProps {
  clienteId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function VisitaForm({ clienteId, onSuccess, onCancel }: VisitaFormProps) {
  const { usuario } = useUser();
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (comentario.trim().length < 20) {
      setError("El comentario debe tener al menos 20 caracteres");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: insertError } = await supabase.from("visitas").insert({
      cliente_id: clienteId,
      usuario_id: usuario!.id,
      comentario: comentario.trim(),
      fecha_visita: new Date().toISOString(),
    });

    if (insertError) {
      setError("Error al guardar la visita. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    onSuccess();
  }

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            placeholder="Describe lo que ocurrió en la visita (mínimo 20 caracteres)..."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {comentario.length}/20 caracteres mínimo
            </span>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Guardando..." : "Guardar Visita"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
