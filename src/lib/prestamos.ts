/**
 * Motor de cálculo de préstamos (plan prestamista).
 *
 * Funciones puras (sin DB) para: tasa por período, cuota francesa/alemana,
 * cronograma de amortización, mora punitoria e imputación de pagos.
 * Montos redondeados a 2 decimales. Todo en pesos.
 */
import type { FrecuenciaPago, SistemaAmortizacion } from '@/server/db/schema';
import { sumarMeses } from '@/lib/fechas';

export const PERIODOS_POR_ANIO: Record<FrecuenciaPago, number> = {
  diaria: 365,
  semanal: 52,
  quincenal: 24,
  mensual: 12,
};

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Tasa por período a partir de la tasa nominal anual (en %). */
export function tasaPorPeriodo(tasaNominalAnualPct: number, frecuencia: FrecuenciaPago): number {
  return tasaNominalAnualPct / 100 / PERIODOS_POR_ANIO[frecuencia];
}

/** Avanza una fecha N períodos según la frecuencia. */
export function sumarPeriodos(base: Date, frecuencia: FrecuenciaPago, n: number): Date {
  if (frecuencia === 'mensual') return sumarMeses(base, n); // clampea fin de mes
  const d = new Date(base);
  switch (frecuencia) {
    case 'diaria':
      d.setDate(d.getDate() + n);
      break;
    case 'semanal':
      d.setDate(d.getDate() + n * 7);
      break;
    case 'quincenal':
      d.setDate(d.getDate() + n * 15);
      break;
  }
  return d;
}

export type CuotaCalculada = {
  numero: number;
  vencimiento: Date;
  montoCuota: number;
  capital: number;
  interes: number;
  saldoPosterior: number;
};

export type ParamsCronograma = {
  capital: number;
  tasaNominalAnualPct: number;
  cantidadCuotas: number;
  frecuencia: FrecuenciaPago;
  sistema: SistemaAmortizacion;
  fechaPrimerVencimiento: Date;
};

/**
 * Genera el cronograma de amortización completo.
 * - Francés: cuota total constante.
 * - Alemán: amortización de capital constante, cuota decreciente.
 * - Americano: solo interés por período, capital íntegro en la última.
 */
export function generarCronograma(p: ParamsCronograma): CuotaCalculada[] {
  const i = tasaPorPeriodo(p.tasaNominalAnualPct, p.frecuencia);
  const n = p.cantidadCuotas;
  const cuotas: CuotaCalculada[] = [];
  let saldo = p.capital;

  // Cuota fija para sistema francés
  const cuotaFrancesa =
    i === 0
      ? p.capital / n
      : (p.capital * (i * Math.pow(1 + i, n))) / (Math.pow(1 + i, n) - 1);

  for (let k = 1; k <= n; k++) {
    const vencimiento = sumarPeriodos(p.fechaPrimerVencimiento, p.frecuencia, k - 1);
    const interes = saldo * i;
    let capital: number;
    let montoCuota: number;

    if (p.sistema === 'frances') {
      montoCuota = cuotaFrancesa;
      capital = montoCuota - interes;
    } else if (p.sistema === 'aleman') {
      capital = p.capital / n;
      montoCuota = capital + interes;
    } else {
      // americano: solo interés, capital en la última
      capital = k === n ? saldo : 0;
      montoCuota = interes + capital;
    }

    // Última cuota: ajustar redondeo para que el saldo cierre en 0
    if (k === n) {
      capital = saldo;
      montoCuota = capital + interes;
    }

    saldo = saldo - capital;
    cuotas.push({
      numero: k,
      vencimiento,
      montoCuota: r2(montoCuota),
      capital: r2(capital),
      interes: r2(interes),
      saldoPosterior: r2(Math.max(0, saldo)),
    });
  }
  return cuotas;
}

/**
 * Mora punitoria devengada sobre una cuota vencida impaga (devengo diario).
 * base = capital+interés impago de la cuota. tasaPunitoria en % anual.
 */
export function calcularMora(
  montoImpago: number,
  vencimiento: Date,
  hoy: Date,
  tasaPunitoriaAnualPct: number,
  diasGracia: number,
): number {
  const msDia = 1000 * 60 * 60 * 24;
  const diasAtraso = Math.floor((hoy.getTime() - vencimiento.getTime()) / msDia) - diasGracia;
  if (diasAtraso <= 0 || montoImpago <= 0 || tasaPunitoriaAnualPct <= 0) return 0;
  return r2(montoImpago * (tasaPunitoriaAnualPct / 100 / 365) * diasAtraso);
}

export type ImputacionPago = { aMora: number; aInteres: number; aCapital: number; sobrante: number };

/**
 * Imputa un pago a una cuota en el orden estándar: mora → interés → capital.
 * Devuelve cuánto se aplicó a cada concepto y el sobrante (para la próxima cuota).
 */
export function imputarPago(
  monto: number,
  pendiente: { mora: number; interes: number; capital: number },
): ImputacionPago {
  let restante = monto;
  const aMora = Math.min(restante, pendiente.mora);
  restante -= aMora;
  const aInteres = Math.min(restante, pendiente.interes);
  restante -= aInteres;
  const aCapital = Math.min(restante, pendiente.capital);
  restante -= aCapital;
  return { aMora: r2(aMora), aInteres: r2(aInteres), aCapital: r2(aCapital), sobrante: r2(restante) };
}
