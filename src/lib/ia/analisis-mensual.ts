/**
 * Análisis mensual del balance con IA (Claude).
 *
 * Recibe el balance ya calculado (números reales, sin inventar) y devuelve una
 * narrativa profesional en español rioplatense: qué pasó este mes, los puntos
 * clave que movieron la aguja, alertas/oportunidades y recomendaciones concretas.
 *
 * Si no está configurada `ANTHROPIC_API_KEY`, cae a un resumen determinístico
 * (sin IA) para que la función siga siendo útil. El modelo es configurable con
 * `GASTOS_ANALISIS_MODEL` (default: Sonnet, buen balance costo/calidad).
 */
import Anthropic from '@anthropic-ai/sdk';
import type { BalanceMensual } from '@/lib/balance';
import { etiquetaIngresoPlan } from '@/lib/gastos';
import type { PlanId } from '@/lib/planes';

const MODELO = process.env.GASTOS_ANALISIS_MODEL ?? 'claude-sonnet-4-6';

const ars = (n: number) =>
  '$ ' + n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const pct = (n: number | null) => (n === null ? 's/d' : `${n > 0 ? '+' : ''}${n.toFixed(1)}%`);

const nombreMes = (mes: string) => {
  const [y, m] = mes.split('-').map(Number);
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${meses[(m ?? 1) - 1]} ${y}`;
};

export type EntradaAnalisis = {
  balance: BalanceMensual;
  plan: PlanId;
  negocio: string;
};

/** Datos del balance formateados como texto para alimentar al modelo (o el fallback). */
function resumenDatos(e: EntradaAnalisis): string {
  const b = e.balance;
  const ingresoLabel = etiquetaIngresoPlan(e.plan);
  const cats = b.gastosPorCategoria.length
    ? b.gastosPorCategoria.map((c) => `  - ${c.categoria}: ${ars(c.monto)} (${c.pct.toFixed(0)}% de los gastos)`).join('\n')
    : '  - (sin gastos cargados)';
  return [
    `Negocio: ${e.negocio}`,
    `Mes: ${nombreMes(b.mes)}`,
    ``,
    `${ingresoLabel} (ingresos): ${ars(b.ingresos)} — vs mes anterior ${ars(b.comparacion.ingresosPrev)} (${pct(b.comparacion.ingresosDeltaPct)})`,
    `Gastos: ${ars(b.gastos)} — vs mes anterior ${ars(b.comparacion.gastosPrev)} (${pct(b.comparacion.gastosDeltaPct)})`,
    `Ganancia neta: ${ars(b.ganancia)} — vs mes anterior ${ars(b.comparacion.gananciaPrev)} (${pct(b.comparacion.gananciaDeltaPct)})`,
    `Margen: ${b.margenPct === null ? 's/d' : b.margenPct.toFixed(1) + '%'}`,
    ``,
    `Gastos por categoría:`,
    cats,
  ].join('\n');
}

/** Resumen sin IA (fallback): claro y honesto, basado solo en las cifras. */
function resumenFallback(e: EntradaAnalisis): string {
  const b = e.balance;
  const signo = b.ganancia >= 0 ? 'ganancia' : 'pérdida';
  const top = b.gastosPorCategoria[0];
  const lineas = [
    `## ${nombreMes(b.mes)} — Resumen`,
    ``,
    `Este mes el negocio tuvo **${ars(b.ingresos)}** de ingresos y **${ars(b.gastos)}** de gastos, ` +
      `con una **${signo} de ${ars(Math.abs(b.ganancia))}**` +
      (b.margenPct !== null ? ` (margen ${b.margenPct.toFixed(1)}%).` : '.'),
    ``,
    `**Comparado con el mes anterior:** ingresos ${pct(b.comparacion.ingresosDeltaPct)}, ` +
      `gastos ${pct(b.comparacion.gastosDeltaPct)}, ganancia ${pct(b.comparacion.gananciaDeltaPct)}.`,
  ];
  if (top) {
    lineas.push('', `**Mayor gasto:** ${top.categoria} (${ars(top.monto)}, ${top.pct.toFixed(0)}% del total de gastos).`);
  }
  lineas.push('', '_Análisis automático. Configurá `ANTHROPIC_API_KEY` para el análisis detallado con IA._');
  return lineas.join('\n');
}

export async function generarAnalisisMensual(
  e: EntradaAnalisis,
): Promise<{ texto: string; generadoPorIA: boolean }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { texto: resumenFallback(e), generadoPorIA: false };

  const datos = resumenDatos(e);
  const sistema =
    'Sos un asesor financiero para dueños de PyMEs argentinas (kioscos, comercios, ' +
    'prestadores de servicios, financieras). Analizás el balance mensual de un negocio ' +
    'y devolvés un análisis claro, honesto y accionable en español rioplatense, en ' +
    'lenguaje simple y directo (nada de jerga contable). Usá EXCLUSIVAMENTE los números ' +
    'que te paso: no inventes datos ni cifras. Si faltan datos, decilo. Escribí en ' +
    'markdown, con secciones cortas y oraciones breves.';

  const instrucciones =
    'Con estos datos del mes, escribí un análisis con esta estructura:\n\n' +
    '## Qué pasó este mes\n(2-3 frases con el panorama general: ganó o perdió, cómo viene vs el mes anterior.)\n\n' +
    '## Puntos clave\n(Viñetas: qué movió la aguja en ingresos y en gastos, qué categoría pesó más, ' +
    'si el margen mejoró o empeoró y por qué.)\n\n' +
    '## Alertas y oportunidades\n(Viñetas: señales para prestar atención —gastos que crecen, margen que cae— ' +
    'y oportunidades concretas.)\n\n' +
    '## Recomendaciones\n(1 o 2 acciones concretas y realistas para el próximo mes.)\n\n' +
    'Sé concreto, mencioná los montos. No repitas la tabla de datos cruda.\n\n' +
    '--- DATOS DEL MES ---\n' +
    datos;

  const client = new Anthropic({ apiKey });
  const resp = await client.messages.create({
    model: MODELO,
    max_tokens: 1200,
    system: sistema,
    messages: [{ role: 'user', content: instrucciones }],
  });

  const texto = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  return { texto: texto || resumenFallback(e), generadoPorIA: true };
}
