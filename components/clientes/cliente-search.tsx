"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { Cliente } from "@/types";

interface ClienteSearchProps {
  onSelect: (cliente: Cliente) => void;
}

export function ClienteSearch({ onSelect }: ClienteSearchProps) {
  const [query, setQuery] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filtered, setFiltered] = useState<Cliente[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function fetch() {
      const supabase = createClient();
      const { data } = await supabase
        .from("clientes")
        .select("*")
        .eq("activo", true)
        .order("nombre_negocio");
      setClientes(data || []);
    }
    fetch();
  }, []);

  useEffect(() => {
    if (!query) {
      setFiltered([]);
      setOpen(false);
      return;
    }
    const term = query.toLowerCase();
    const results = clientes
      .filter(
        (c) =>
          c.nombre_negocio.toLowerCase().includes(term) ||
          c.codigo_cliente.toLowerCase().includes(term)
      )
      .slice(0, 8);
    setFiltered(results);
    setOpen(results.length > 0);
  }, [query, clientes]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente por nombre o código..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-card shadow-lg">
          {filtered.map((c) => (
            <button
              key={c.id}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg"
              onClick={() => {
                onSelect(c);
                setQuery(c.nombre_negocio);
                setOpen(false);
              }}
            >
              <span className="font-medium">{c.nombre_negocio}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {c.codigo_cliente}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
