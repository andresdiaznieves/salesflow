"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Visita } from "@/types";

interface EditVisitaFormProps {
  visita: Visita;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditVisitaForm({
  visita,
  onSuccess,
  onCancel,
}: EditVisitaFormProps) {
  const [comentario, setComentario] = useState(visita.comentario);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (comentario.trim().length < 20) {
      setError("El comentario debe tener al menos 20 caracteres");
      return;
    }

    if (comentario.trim() === visita.comentario) {
      onCancel();
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("visitas")
      .update({
        comentario: comentario.trim(),
        editado: true,
        fecha_edicion: new Date().toISOString(),
      })
      .eq("id", visita.id);

    if (updateError) {
      setError("Error al actualizar. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
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
          {loading ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>
    </form>
  );
}
