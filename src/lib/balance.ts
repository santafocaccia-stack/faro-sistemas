/**
 * Cálculo puro del balance mensual (sin DB): cruza ingresos del plan con los
 * gastos cargados y arma totales, ganancia, margen, desglose por categoría y la
 * comparación contra el mes anterior. Las cifras se redondean a 2 decimales.
 *
 * Las consultas a la base viven en `src/server/actions/gastos.ts`; acá solo está
 * la aritmética, para poder testearla de forma determinística.
 */

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Variación porcentual cur vs prev. null si no hay base previa (prev = 0). */
export function variacionPct(cur: number, prev: number): number | null {
  if (prev === 0) return null;
  return r2(((cur - prev) / Math.abs(prev)) * 100);
}

export type GastoCategoria = { categoria: string; monto: number; pct: number };

export type BalanceMensual = {
  mes: string; // 'YYYY-MM'
  ingresos: number;
  gastos: number;
  ganancia: number;
  /** ganancia / ingresos * 100. null si no hubo ingresos. */
  margenPct: number | null;
  gastosPorCategoria: GastoCategoria[];
  comparacion: {
    ingresosPrev: number;
    gastosPrev: number;
    gananciaPrev: number;
    ingresosDeltaPct: number | null;
    gastosDeltaPct: number | null;
    gananciaDeltaPct: number | null;
  };
};

/** Agrupa filas de gasto por categoría, ordena por monto desc y calcula su % del total. */
export function agruparGastos(filas: { categoria: string; monto: number }[]): GastoCategoria[] {
  const mapa = new Map<string, number>();
  for (const f of filas) {
    const cat = f.categoria.trim() || 'Otros';
    mapa.set(cat, (mapa.get(cat) ?? 0) + f.monto);
  }
  const total = [...mapa.values()].reduce((a, b) => a + b, 0);
  return [...mapa.entries()]
    .map(([categoria, monto]) => ({
      categoria,
      monto: r2(monto),
      pct: total > 0 ? r2((monto / total) * 100) : 0,
    }))
    .sort((a, b) => b.monto - a.monto);
}

export function construirBalance(params: {
  mes: string;
  ingresos: number;
  gastosFilas: { categoria: string; monto: number }[];
  ingresosPrev: number;
  gastosPrev: number;
}): BalanceMensual {
  const gastosPorCategoria = agruparGastos(params.gastosFilas);
  const gastos = r2(params.gastosFilas.reduce((a, g) => a + g.monto, 0));
  const ingresos = r2(params.ingresos);
  const ganancia = r2(ingresos - gastos);
  const gananciaPrev = r2(params.ingresosPrev - params.gastosPrev);

  return {
    mes: params.mes,
    ingresos,
    gastos,
    ganancia,
    margenPct: ingresos > 0 ? r2((ganancia / ingresos) * 100) : null,
    gastosPorCategoria,
    comparacion: {
      ingresosPrev: r2(params.ingresosPrev),
      gastosPrev: r2(params.gastosPrev),
      gananciaPrev,
      ingresosDeltaPct: variacionPct(ingresos, params.ingresosPrev),
      gastosDeltaPct: variacionPct(gastos, params.gastosPrev),
      gananciaDeltaPct: variacionPct(ganancia, gananciaPrev),
    },
  };
}

/** Rango [inicio, finExclusivo) de un mes 'YYYY-MM' como fechas YYYY-MM-DD. */
export function rangoMes(mes: string): { inicio: string; fin: string; mesPrev: string } {
  const [y, m] = mes.split('-').map(Number);
  const inicio = `${y}-${String(m).padStart(2, '0')}-01`;
  const finY = m === 12 ? y! + 1 : y!;
  const finM = m === 12 ? 1 : m! + 1;
  const fin = `${finY}-${String(finM).padStart(2, '0')}-01`;
  const prevY = m === 1 ? y! - 1 : y!;
  const prevM = m === 1 ? 12 : m! - 1;
  const mesPrev = `${prevY}-${String(prevM).padStart(2, '0')}`;
  return { inicio, fin, mesPrev };
}
