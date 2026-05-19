import Anthropic from "@anthropic-ai/sdk";

export interface ClientInsightData {
  nombre_cliente: string;
  codigo_cliente: string;
  segmento?: string;
  tipo_negocio?: string;
  ciudad?: string;
  volumen_total_cajas: number;
  ventas_total_cop: number;
  margen_promedio: number;
  sell_out_promedio: number;
  eventos_ejecutados: number;
  marcas: Array<{
    marca: string;
    volumen: number;
    porcentaje_mix: number;
    margen: number;
    sell_out: number;
  }>;
  tendencia_mensual: Array<{
    mes: string;
    volumen: number;
  }>;
}

export interface Insight {
  prioridad: number;
  titulo: string;
  descripcion: string;
  accion_sugerida: string;
  impacto_estimado_cajas: number;
  razonamiento: string;
}

const SYSTEM_PROMPT = `Eres un analista comercial experto en el sector de bebidas alcohólicas y gestión de punto de venta en Colombia. Tu rol es generar insights accionables para representantes de ventas que visitan clientes.

Responde SIEMPRE en español. Genera exactamente 3 insights en formato JSON válido.`;

function buildUserPrompt(data: ClientInsightData): string {
  const marcasStr = data.marcas
    .map((m) => `  - ${m.marca}: ${m.volumen} cajas (${m.porcentaje_mix.toFixed(1)}% del mix), margen ${m.margen.toFixed(1)}%, sell-out ${m.sell_out.toFixed(1)}%`)
    .join("\n");

  const tendenciaStr = data.tendencia_mensual
    .map((t) => `  - ${t.mes}: ${t.volumen} cajas`)
    .join("\n");

  return `Analiza este cliente y genera 3 insights accionables:

Cliente: ${data.nombre_cliente} (${data.codigo_cliente})
Segmento: ${data.segmento || "Sin definir"}
Tipo de negocio: ${data.tipo_negocio || "Sin definir"}
Ciudad: ${data.ciudad || "Sin definir"}

Métricas actuales:
- Volumen total: ${data.volumen_total_cajas} cajas
- Ventas totales: $${data.ventas_total_cop.toLocaleString()} COP
- Margen promedio: ${data.margen_promedio.toFixed(1)}%
- Sell-out promedio: ${data.sell_out_promedio.toFixed(1)}%
- Eventos ejecutados: ${data.eventos_ejecutados}

Mix de marcas:
${marcasStr}

Tendencia mensual de volumen:
${tendenciaStr}

Genera exactamente 3 insights en este formato JSON:
[
  {
    "prioridad": 1,
    "titulo": "Título accionable y específico",
    "descripcion": "Explicación breve del insight",
    "accion_sugerida": "Qué debe hacer el representante en la próxima visita",
    "impacto_estimado_cajas": número,
    "razonamiento": "Por qué este insight es relevante"
  }
]

Prioriza insights que:
1. Cierren el gap de volumen del cliente
2. Mejoren ejecución en punto de venta
3. Aprovechen tendencias positivas o reviertan negativas
4. Optimicen el mix de marcas

Responde SOLO con el JSON, sin texto adicional.`;
}

export async function generateInsightsWithClaude(
  data: ClientInsightData
): Promise<Insight[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return generateFallbackInsights(data);
  }

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: buildUserPrompt(data) },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const insights: Insight[] = JSON.parse(text);
    return insights;
  } catch {
    return generateFallbackInsights(data);
  }
}

function generateFallbackInsights(data: ClientInsightData): Insight[] {
  const insights: Insight[] = [];
  const tendencia = data.tendencia_mensual;

  // Insight 1: Trend analysis
  if (tendencia.length >= 2) {
    const last = tendencia[tendencia.length - 1];
    const prev = tendencia[tendencia.length - 2];
    const change = prev.volumen > 0
      ? ((last.volumen - prev.volumen) / prev.volumen) * 100 : 0;

    if (change < -10) {
      insights.push({
        prioridad: 1,
        titulo: `Caída de ${Math.abs(change).toFixed(0)}% en volumen — requiere acción inmediata`,
        descripcion: `El volumen cayó de ${prev.volumen} a ${last.volumen} cajas entre ${prev.mes} y ${last.mes}. Esta tendencia puede indicar pérdida de espacio en anaquel o competencia agresiva.`,
        accion_sugerida: "Visitar al cliente para entender la causa de la caída. Verificar exhibición, precios y presencia de competencia. Proponer activación o descuento temporal.",
        impacto_estimado_cajas: Math.abs(last.volumen - prev.volumen),
        razonamiento: "Una caída significativa necesita intervención rápida antes de que se convierta en tendencia sostenida.",
      });
    } else if (change > 10) {
      insights.push({
        prioridad: 1,
        titulo: `Crecimiento de ${change.toFixed(0)}% — oportunidad de expansión`,
        descripcion: `El volumen creció de ${prev.volumen} a ${last.volumen} cajas entre ${prev.mes} y ${last.mes}. El cliente está en un momento ideal para ampliar portfolio.`,
        accion_sugerida: "Aprovechar el momentum positivo para introducir una marca adicional o negociar más espacio de exhibición.",
        impacto_estimado_cajas: Math.round(last.volumen * 0.15),
        razonamiento: "Clientes en crecimiento tienen mayor receptividad a nuevas propuestas comerciales.",
      });
    } else {
      insights.push({
        prioridad: 2,
        titulo: "Volumen estable — enfoque en rentabilidad",
        descripcion: `El volumen se mantiene estable alrededor de ${last.volumen} cajas. Con volumen constante, el foco debe estar en mejorar el mix y margen.`,
        accion_sugerida: "Revisar el mix de marcas y promover las de mayor margen. Evaluar si hay oportunidad de mejorar el precio promedio.",
        impacto_estimado_cajas: Math.round(last.volumen * 0.05),
        razonamiento: "Cuando el volumen está plano, la palanca de crecimiento está en el mix y la rentabilidad.",
      });
    }
  }

  // Insight 2: Brand mix
  if (data.marcas.length > 1) {
    const topMarca = data.marcas[0];
    const lowMarcas = data.marcas.filter((m) => m.porcentaje_mix < 15);

    if (topMarca.porcentaje_mix > 60) {
      insights.push({
        prioridad: 2,
        titulo: `Alta concentración en ${topMarca.marca} (${topMarca.porcentaje_mix.toFixed(0)}% del mix)`,
        descripcion: `El ${topMarca.porcentaje_mix.toFixed(0)}% del volumen está concentrado en una sola marca. Esto genera riesgo si hay problemas de abastecimiento o cambios de precio.`,
        accion_sugerida: `Proponer degustación o exhibición especial de ${lowMarcas.length > 0 ? lowMarcas.map((m) => m.marca).join(", ") : "marcas secundarias"} para diversificar el portfolio.`,
        impacto_estimado_cajas: Math.round(data.volumen_total_cajas * 0.1),
        razonamiento: "Diversificar el mix reduce riesgo y generalmente mejora el margen total del cliente.",
      });
    } else {
      insights.push({
        prioridad: 2,
        titulo: "Mix de marcas balanceado — optimizar por margen",
        descripcion: `El portfolio está bien distribuido entre ${data.marcas.length} marcas. La oportunidad está en rotar el mix hacia las marcas de mayor margen.`,
        accion_sugerida: `Revisar cuáles marcas tienen mejor margen y negociar más espacio para ellas. Actualmente la marca con mejor margen es ${data.marcas.reduce((best, m) => m.margen > best.margen ? m : best).marca}.`,
        impacto_estimado_cajas: Math.round(data.volumen_total_cajas * 0.08),
        razonamiento: "Con un mix ya diversificado, el siguiente paso natural es optimizar por rentabilidad.",
      });
    }
  }

  // Insight 3: Sell-out / events
  if (data.sell_out_promedio < 70) {
    insights.push({
      prioridad: 3,
      titulo: `Sell-out bajo (${data.sell_out_promedio.toFixed(0)}%) — riesgo de sobre-inventario`,
      descripcion: `Un sell-out por debajo del 70% indica que el producto se está acumulando en el punto de venta. Esto puede llevar a reducciones de pedido futuras.`,
      accion_sugerida: "Implementar activación en punto de venta (degustación, descuento al consumidor, exhibición especial) para acelerar la rotación.",
      impacto_estimado_cajas: Math.round(data.volumen_total_cajas * 0.12),
      razonamiento: "Mejorar el sell-out asegura la recompra y mantiene la confianza del cliente en el producto.",
    });
  } else if (data.eventos_ejecutados === 0) {
    insights.push({
      prioridad: 3,
      titulo: "Sin eventos ejecutados — potencial sin explotar",
      descripcion: `No se han registrado eventos en este cliente. Las activaciones en punto de venta típicamente generan un incremento del 15-25% en volumen durante la semana del evento.`,
      accion_sugerida: "Planificar al menos 1 activación este mes: degustación de fin de semana o exhibición especial con material POP.",
      impacto_estimado_cajas: Math.round(data.volumen_total_cajas * 0.2),
      razonamiento: "Los clientes sin activaciones tienen un potencial de crecimiento no aprovechado.",
    });
  } else {
    insights.push({
      prioridad: 3,
      titulo: `Buen sell-out (${data.sell_out_promedio.toFixed(0)}%) — mantener momentum`,
      descripcion: `El sell-out está saludable y se han ejecutado ${data.eventos_ejecutados} eventos. El foco debe ser mantener la ejecución y buscar incrementos graduales.`,
      accion_sugerida: "Mantener la frecuencia de visitas y asegurar que el material POP esté siempre actualizado. Considerar incremento de pedido del 5-10%.",
      impacto_estimado_cajas: Math.round(data.volumen_total_cajas * 0.07),
      razonamiento: "Cuando la ejecución es buena, el crecimiento viene de la consistencia y pequeños incrementos.",
    });
  }

  return insights.sort((a, b) => a.prioridad - b.prioridad);
}
