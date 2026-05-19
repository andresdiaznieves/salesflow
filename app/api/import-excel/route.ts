import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface ExcelRow {
  COD_CLIENTE?: string | number;
  COD_REP?: string;
  Ciudad?: string;
  "Punto de Venta"?: string;
  Marca?: string;
  Mes?: string;
  "Volumen Cajas"?: number;
  "Ventas COP"?: number;
  "Inversion Trade COP"?: number;
  "Margen %"?: number;
  "Participacion Premium %"?: number;
  "Eventos Ejecutados"?: number;
  "Sell Out %"?: number;
}

const MESES_VALIDOS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (usuario?.rol !== "SUPERVISOR") {
    return NextResponse.json(
      { error: "Solo supervisores pueden importar datos" },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const year = parseInt(formData.get("year") as string) || new Date().getFullYear();

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const sheetName = workbook.SheetNames.find(
      (name) => name.toLowerCase().includes("comercial") || name.toLowerCase().includes("venta")
    ) || workbook.SheetNames[0];

    const sheet = workbook.Sheets[sheetName];
    const rows: ExcelRow[] = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      return NextResponse.json({ error: "El archivo no contiene datos" }, { status: 400 });
    }

    const errors: string[] = [];
    const records: Array<{
      codigo_cliente: string;
      codigo_representante: string;
      ciudad: string;
      punto_de_venta: string;
      marca: string;
      mes: string;
      ano: number;
      volumen_cajas: number;
      ventas_cop: number;
      inversion_trade_cop: number;
      margen_porcentaje: number;
      participacion_premium_porcentaje: number;
      eventos_ejecutados: number;
      sell_out_porcentaje: number;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const codigoCliente = String(row.COD_CLIENTE || "").trim();
      const codigoRep = String(row.COD_REP || "").trim();
      const marca = String(row.Marca || "").trim();
      const mes = String(row.Mes || "").trim();

      if (!codigoCliente || !marca || !mes) {
        errors.push(`Fila ${rowNum}: Faltan campos requeridos (COD_CLIENTE, Marca, Mes)`);
        continue;
      }

      if (!MESES_VALIDOS.includes(mes)) {
        errors.push(`Fila ${rowNum}: Mes inválido "${mes}"`);
        continue;
      }

      records.push({
        codigo_cliente: codigoCliente,
        codigo_representante: codigoRep,
        ciudad: String(row.Ciudad || ""),
        punto_de_venta: String(row["Punto de Venta"] || ""),
        marca,
        mes,
        ano: year,
        volumen_cajas: Number(row["Volumen Cajas"]) || 0,
        ventas_cop: Number(row["Ventas COP"]) || 0,
        inversion_trade_cop: Number(row["Inversion Trade COP"]) || 0,
        margen_porcentaje: Number(row["Margen %"]) || 0,
        participacion_premium_porcentaje: Number(row["Participacion Premium %"]) || 0,
        eventos_ejecutados: Number(row["Eventos Ejecutados"]) || 0,
        sell_out_porcentaje: Number(row["Sell Out %"]) || 0,
      });
    }

    if (records.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron registros válidos", errors },
        { status: 400 }
      );
    }

    // Deduplicate: keep last occurrence for each unique key
    const deduped = new Map<string, (typeof records)[0]>();
    for (const r of records) {
      const key = `${r.codigo_cliente}|${r.marca}|${r.mes}|${r.ano}`;
      deduped.set(key, r);
    }
    const uniqueRecords = Array.from(deduped.values());

    // Insert in batches of 500 to avoid payload limits
    let totalInserted = 0;
    const batchSize = 500;
    let upsertError = null;

    for (let i = 0; i < uniqueRecords.length; i += batchSize) {
      const batch = uniqueRecords.slice(i, i + batchSize);
      const { error, count: batchCount } = await supabase
        .from("datos_venta")
        .upsert(batch, {
          onConflict: "codigo_cliente,marca,mes,ano",
          count: "exact",
        });

      if (error) {
        upsertError = error;
        break;
      }
      totalInserted += batchCount || batch.length;
    }

    const count = totalInserted;

    if (upsertError) {
      return NextResponse.json(
        { error: "Error al insertar datos: " + upsertError.message },
        { status: 500 }
      );
    }

    // Auto-create clients that don't exist
    const uniqueClients = [
      ...new Map(
        records.map((r) => [
          r.codigo_cliente,
          {
            codigo_cliente: r.codigo_cliente,
            nombre_negocio: r.punto_de_venta || `Cliente ${r.codigo_cliente}`,
            ciudad: r.ciudad,
            codigo_representante: r.codigo_representante,
            tipo_negocio: "PUNTO_DE_VENTA" as const,
            activo: true,
          },
        ])
      ).values(),
    ];

    await supabase
      .from("clientes")
      .upsert(uniqueClients, { onConflict: "codigo_cliente", ignoreDuplicates: true });

    return NextResponse.json({
      success: true,
      imported: count || records.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      totalRows: rows.length,
      validRecords: records.length,
      skippedRows: errors.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Error procesando el archivo: " + (err as Error).message },
      { status: 500 }
    );
  }
}
