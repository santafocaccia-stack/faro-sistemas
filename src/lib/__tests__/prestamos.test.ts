import { describe, it, expect } from 'vitest';
import {
  generarCronograma,
  calcularMora,
  imputarPago,
  sumarPeriodos,
  tasaPorPeriodo,
  type ParamsCronograma,
} from '@/lib/prestamos';

const sum = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) * 100) / 100;

describe('sumarPeriodos', () => {
  it('mensual con día 31 clampea fin de mes (no se desborda)', () => {
    const v1 = sumarPeriodos(new Date(2026, 0, 31), 'mensual', 1); // +1 → feb
    expect(v1.getMonth()).toBe(1);
    expect(v1.getDate()).toBe(28);
    const v2 = sumarPeriodos(new Date(2026, 0, 31), 'mensual', 2); // +2 → mar
    expect(v2.getMonth()).toBe(2);
    expect(v2.getDate()).toBe(31);
  });

  it('semanal y quincenal suman días', () => {
    expect(sumarPeriodos(new Date(2026, 0, 1), 'semanal', 2).getDate()).toBe(15);
    expect(sumarPeriodos(new Date(2026, 0, 1), 'quincenal', 1).getDate()).toBe(16);
  });
});

describe('generarCronograma — sistema francés', () => {
  const params: ParamsCronograma = {
    capital: 120000,
    tasaNominalAnualPct: 60,
    cantidadCuotas: 6,
    frecuencia: 'mensual',
    sistema: 'frances',
    fechaPrimerVencimiento: new Date(2026, 0, 31), // 31-ene: caso borde
  };

  it('los vencimientos respetan el clamp de fin de mes', () => {
    const c = generarCronograma(params);
    expect(c[0]!.vencimiento.getDate()).toBe(31); // ene
    expect(c[1]!.vencimiento.getMonth()).toBe(1); // feb
    expect(c[1]!.vencimiento.getDate()).toBe(28); // 28-feb, NO 3-mar
    expect(c[2]!.vencimiento.getDate()).toBe(31); // mar
  });

  it('cuota total constante y capital suma el principal', () => {
    const c = generarCronograma(params);
    const cuotas = c.map((x) => x.montoCuota);
    // Todas las cuotas iguales salvo ajuste de redondeo en la última
    expect(Math.abs(cuotas[0]! - cuotas[1]!)).toBeLessThan(0.02);
    expect(sum(c.map((x) => x.capital))).toBe(120000);
    expect(c.at(-1)!.saldoPosterior).toBe(0);
  });
});

describe('generarCronograma — alemán y americano', () => {
  it('alemán: amortización de capital constante', () => {
    const c = generarCronograma({
      capital: 100000,
      tasaNominalAnualPct: 12,
      cantidadCuotas: 4,
      frecuencia: 'mensual',
      sistema: 'aleman',
      fechaPrimerVencimiento: new Date(2026, 0, 10),
    });
    expect(c.every((x) => x.capital === 25000)).toBe(true);
    expect(c.at(-1)!.saldoPosterior).toBe(0);
  });

  it('americano: solo interés y capital íntegro en la última', () => {
    const c = generarCronograma({
      capital: 50000,
      tasaNominalAnualPct: 24,
      cantidadCuotas: 3,
      frecuencia: 'mensual',
      sistema: 'americano',
      fechaPrimerVencimiento: new Date(2026, 0, 10),
    });
    expect(c[0]!.capital).toBe(0);
    expect(c[1]!.capital).toBe(0);
    expect(c.at(-1)!.capital).toBe(50000);
    expect(sum(c.map((x) => x.capital))).toBe(50000);
  });

  it('tasa 0% reparte capital sin interés', () => {
    const c = generarCronograma({
      capital: 60000,
      tasaNominalAnualPct: 0,
      cantidadCuotas: 6,
      frecuencia: 'mensual',
      sistema: 'frances',
      fechaPrimerVencimiento: new Date(2026, 0, 10),
    });
    expect(c.every((x) => x.interes === 0)).toBe(true);
    expect(c.every((x) => x.montoCuota === 10000)).toBe(true);
  });
});

describe('calcularMora — devengo diario', () => {
  const venc = new Date(2026, 0, 1);

  it('acumula mora diaria sobre el saldo impago', () => {
    const hoy = new Date(2026, 0, 11); // 10 días de atraso
    // tasa 365% anual → 1%/día. 10000 * 0.01 * 10 = 1000
    expect(calcularMora(10000, venc, hoy, 365, 0)).toBe(1000);
  });

  it('respeta los días de gracia', () => {
    const hoy = new Date(2026, 0, 11);
    expect(calcularMora(10000, venc, hoy, 365, 3)).toBe(700); // 7 días efectivos
  });

  it('no devenga antes del vencimiento ni dentro de la gracia', () => {
    expect(calcularMora(10000, new Date(2026, 0, 5), venc, 365, 0)).toBe(0);
    const hoyDentroGracia = new Date(2026, 0, 3); // 2 días < 3 de gracia
    expect(calcularMora(10000, venc, hoyDentroGracia, 365, 3)).toBe(0);
  });

  it('sin saldo impago o sin tasa no hay mora', () => {
    const hoy = new Date(2026, 0, 11);
    expect(calcularMora(0, venc, hoy, 365, 0)).toBe(0);
    expect(calcularMora(10000, venc, hoy, 0, 0)).toBe(0);
  });
});

describe('imputarPago — orden mora → interés → capital', () => {
  it('cubre en orden y calcula el sobrante', () => {
    const r = imputarPago(1500, { mora: 200, interes: 500, capital: 1000 });
    expect(r).toEqual({ aMora: 200, aInteres: 500, aCapital: 800, sobrante: 0 });
  });

  it('pago que supera lo pendiente deja sobrante (para la próxima cuota)', () => {
    const r = imputarPago(2000, { mora: 100, interes: 400, capital: 1000 });
    expect(r.aMora).toBe(100);
    expect(r.aInteres).toBe(400);
    expect(r.aCapital).toBe(1000);
    expect(r.sobrante).toBe(500);
  });

  it('pago parcial se queda en la mora', () => {
    const r = imputarPago(50, { mora: 200, interes: 500, capital: 1000 });
    expect(r).toEqual({ aMora: 50, aInteres: 0, aCapital: 0, sobrante: 0 });
  });
});

describe('tasaPorPeriodo', () => {
  it('divide la nominal anual por los períodos del año', () => {
    expect(tasaPorPeriodo(120, 'mensual')).toBeCloseTo(0.1, 10); // 120%/12 = 10%
    expect(tasaPorPeriodo(365, 'diaria')).toBeCloseTo(0.01, 10);
  });
});
