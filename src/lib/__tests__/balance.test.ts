import { describe, it, expect } from 'vitest';
import { construirBalance, agruparGastos, variacionPct, rangoMes } from '@/lib/balance';

describe('variacionPct', () => {
  it('calcula la variación porcentual', () => {
    expect(variacionPct(150, 100)).toBe(50);
    expect(variacionPct(80, 100)).toBe(-20);
  });
  it('devuelve null si no hay base previa', () => {
    expect(variacionPct(100, 0)).toBeNull();
  });
});

describe('agruparGastos', () => {
  it('agrupa por categoría, ordena desc y calcula %', () => {
    const r = agruparGastos([
      { categoria: 'Luz', monto: 100 },
      { categoria: 'Empleados', monto: 300 },
      { categoria: 'Luz', monto: 100 },
    ]);
    expect(r[0]).toEqual({ categoria: 'Empleados', monto: 300, pct: 60 });
    expect(r[1]).toEqual({ categoria: 'Luz', monto: 200, pct: 40 });
  });
  it('normaliza categoría vacía a "Otros"', () => {
    const r = agruparGastos([{ categoria: '  ', monto: 50 }]);
    expect(r[0]!.categoria).toBe('Otros');
  });
});

describe('rangoMes', () => {
  it('arma el rango [inicio, fin) y el mes anterior', () => {
    expect(rangoMes('2026-06')).toEqual({ inicio: '2026-06-01', fin: '2026-07-01', mesPrev: '2026-05' });
  });
  it('cruza el cambio de año', () => {
    expect(rangoMes('2026-01')).toEqual({ inicio: '2026-01-01', fin: '2026-02-01', mesPrev: '2025-12' });
    expect(rangoMes('2026-12')).toEqual({ inicio: '2026-12-01', fin: '2027-01-01', mesPrev: '2026-11' });
  });
});

describe('construirBalance', () => {
  const base = construirBalance({
    mes: '2026-06',
    ingresos: 1_000_000,
    gastosFilas: [
      { categoria: 'Mercadería', monto: 400_000 },
      { categoria: 'Empleados', monto: 200_000 },
      { categoria: 'Luz', monto: 50_000 },
    ],
    ingresosPrev: 800_000,
    gastosPrev: 500_000,
  });

  it('calcula totales, ganancia y margen', () => {
    expect(base.ingresos).toBe(1_000_000);
    expect(base.gastos).toBe(650_000);
    expect(base.ganancia).toBe(350_000);
    expect(base.margenPct).toBe(35);
  });

  it('ordena las categorías y calcula deltas vs mes anterior', () => {
    expect(base.gastosPorCategoria[0]!.categoria).toBe('Mercadería');
    expect(base.comparacion.ingresosDeltaPct).toBe(25); // 1M vs 800k
    expect(base.comparacion.gastosDeltaPct).toBe(30); // 650k vs 500k
    // ganancia: 350k vs (800k-500k)=300k → +16.7%
    expect(base.comparacion.gananciaDeltaPct).toBeCloseTo(16.67, 1);
  });

  it('margen null si no hubo ingresos', () => {
    const b = construirBalance({ mes: '2026-06', ingresos: 0, gastosFilas: [{ categoria: 'Luz', monto: 1000 }], ingresosPrev: 0, gastosPrev: 0 });
    expect(b.margenPct).toBeNull();
    expect(b.ganancia).toBe(-1000);
  });
});
