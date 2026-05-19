"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import type { Cliente } from "@/types";

export default function ClientesPage() {
  const { usuario, isSupervisor } = useUser();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [segmentoFilter, setSegmentoFilter] = useState<string>("todos");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!usuario) return;

    async function fetchClientes() {
      const supabase = createClient();
      let query = supabase
        .from("clientes")
        .select("*")
        .eq("activo", true)
        .order("nombre_negocio");

      if (!isSupervisor && usuario?.codigo_representante) {
        query = query.eq("codigo_representante", usuario.codigo_representante);
      }

      const { data } = await query;
      setClientes(data || []);
      setFilteredClientes(data || []);
      setLoading(false);
    }

    fetchClientes();
  }, [usuario, isSupervisor]);

  useEffect(() => {
    let result = clientes;

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.nombre_negocio.toLowerCase().includes(term) ||
          c.codigo_cliente.toLowerCase().includes(term) ||
          c.nombre_dueno?.toLowerCase().includes(term) ||
          c.barrio?.toLowerCase().includes(term)
      );
    }

    if (segmentoFilter !== "todos") {
      result = result.filter((c) => c.segmento === segmentoFilter);
    }

    if (tipoFilter !== "todos") {
      result = result.filter((c) => c.tipo_negocio === tipoFilter);
    }

    setFilteredClientes(result);
  }, [search, segmentoFilter, tipoFilter, clientes]);

  const segmentoColor: Record<string, string> = {
    A: "bg-green-100 text-green-800",
    B: "bg-blue-100 text-blue-800",
    C: "bg-yellow-100 text-yellow-800",
    D: "bg-red-100 text-red-800",
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-10 w-full bg-muted rounded animate-pulse" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          {filteredClientes.length} de {clientes.length} clientes
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, código o barrio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={segmentoFilter} onValueChange={(v) => v && setSegmentoFilter(v)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Segmento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="A">Segmento A</SelectItem>
            <SelectItem value="B">Segmento B</SelectItem>
            <SelectItem value="C">Segmento C</SelectItem>
            <SelectItem value="D">Segmento D</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tipoFilter} onValueChange={(v) => v && setTipoFilter(v)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="TIENDA">Tienda</SelectItem>
            <SelectItem value="BAR">Bar</SelectItem>
            <SelectItem value="RESTAURANTE">Restaurante</SelectItem>
            <SelectItem value="SUPERMERCADO">Supermercado</SelectItem>
            <SelectItem value="PUNTO_DE_VENTA">Punto de Venta</SelectItem>
            <SelectItem value="OTRO">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredClientes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No se encontraron clientes</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClientes.map((cliente) => (
            <Link
              key={cliente.id}
              href={`/clientes/${cliente.id}`}
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">
                        {cliente.nombre_negocio}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {cliente.codigo_cliente}
                      </p>
                    </div>
                    {cliente.segmento && (
                      <Badge
                        className={`text-xs ${segmentoColor[cliente.segmento] || ""}`}
                        variant="secondary"
                      >
                        {cliente.segmento}
                      </Badge>
                    )}
                  </div>
                  {cliente.nombre_dueno && (
                    <p className="text-sm text-muted-foreground mb-1">
                      {cliente.nombre_dueno}
                    </p>
                  )}
                  <div className="flex flex-col gap-1 mt-2">
                    {cliente.barrio && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">
                          {cliente.barrio}
                          {cliente.ciudad ? `, ${cliente.ciudad}` : ""}
                        </span>
                      </div>
                    )}
                    {cliente.telefono && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {cliente.telefono}
                      </div>
                    )}
                  </div>
                  {cliente.tipo_negocio && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      {cliente.tipo_negocio.replace("_", " ")}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Users(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
