"use client";

import { useState, useRef } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";

interface ImportResult {
  success?: boolean;
  imported?: number;
  totalRows?: number;
  validRecords?: number;
  skippedRows?: number;
  errors?: string[];
  error?: string;
}

export default function ImportarPage() {
  const { isSupervisor } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isSupervisor) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No tienes permisos para acceder a esta sección</p>
      </div>
    );
  }

  async function handleImport() {
    if (!file) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("year", year);

    try {
      const response = await fetch("/api/import-excel", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch {
      setResult({ error: "Error de conexión. Intenta de nuevo." });
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
    }
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importar Datos de Venta</h1>
        <p className="text-sm text-muted-foreground">
          Sube un archivo Excel con los datos comerciales del equipo
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Archivo Excel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Haz clic para seleccionar un archivo .xlsx
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Año de los datos</Label>
            <Select value={year} onValueChange={(v) => v && setYear(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-medium mb-1">Formato esperado:</p>
            <p className="text-xs text-muted-foreground">
              COD_CLIENTE, COD_REP, Ciudad, Punto de Venta, Marca, Mes,
              Volumen Cajas, Ventas COP, Inversion Trade COP, Margen %,
              Participacion Premium %, Eventos Ejecutados, Sell Out %
            </p>
          </div>

          <Button
            onClick={handleImport}
            disabled={!file || loading}
            className="w-full"
          >
            {loading ? "Procesando..." : "Importar Datos"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card
          className={
            result.success
              ? "border-green-200 bg-green-50/50"
              : "border-red-200 bg-red-50/50"
          }
        >
          <CardContent className="p-4">
            {result.success ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Importación exitosa</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center p-2 bg-white rounded-lg">
                    <p className="text-lg font-bold">{result.totalRows}</p>
                    <p className="text-xs text-muted-foreground">Filas totales</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg">
                    <p className="text-lg font-bold text-green-600">
                      {result.validRecords}
                    </p>
                    <p className="text-xs text-muted-foreground">Importados</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg">
                    <p className="text-lg font-bold text-orange-600">
                      {result.skippedRows || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Omitidos</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-red-700">
                <AlertCircle className="h-5 w-5 mt-0.5" />
                <div>
                  <p className="font-medium">Error en la importación</p>
                  <p className="text-sm">{result.error}</p>
                </div>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-medium text-orange-700">
                  Advertencias:
                </p>
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-orange-600">
                    {err}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
