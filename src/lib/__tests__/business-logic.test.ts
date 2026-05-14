import { describe, test, expect } from 'vitest';
import {
  calcularTotalesVenta,
  validarLimiteCredito,
  calcularSaldoPostPago,
  calcularSaldoPostVenta,
} from '../business-logic';

// ─────────────────────────────────────────────────────────────────────────────
describe('calcularTotalesVenta', () => {
  test('una sola línea sin descuento', () => {
    const { subtotal, total } = calcularTotalesVenta([{ subtotal: '1000.00' }], 0);
    expect(subtotal).toBe(1000);
    expect(total).toBe(1000);
  });

  test('suma correctamente múltiples líneas', () => {
    const lineas = [
      { subtotal: '1000.00' },
      { subtotal: '2500.50' },
      { subtotal: '750.00' },
    ];
    const { subtotal, total } = calcularTotalesVenta(lineas, 0);
    expect(subtotal).toBeCloseTo(4250.5);
    expect(total).toBeCloseTo(4250.5);
  });

  test('aplica descuento correctamente', () => {
    const { subtotal, descuento, total } = calcularTotalesVenta([{ subtotal: '1000.00' }], 150);
    expect(subtotal).toBe(1000);
    expect(descuento).toBe(150);
    expect(total).toBe(850);
  });

  test('acepta subtotales numéricos además de strings', () => {
    const { total } = calcularTotalesVenta([{ subtotal: 500 }, { subtotal: 500 }], 0);
    expect(total).toBe(1000);
  });

  test('lista vacía da cero', () => {
    const { subtotal, total } = calcularTotalesVenta([], 0);
    expect(subtotal).toBe(0);
    expect(total).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('validarLimiteCredito', () => {
  test('no lanza si límite es 0 (sin límite configurado)', () => {
    expect(() => validarLimiteCredito(50_000, 10_000, 0)).not.toThrow();
  });

  test('no lanza si saldo posterior es menor al límite', () => {
    expect(() => validarLimiteCredito(5_000, 2_000, 10_000)).not.toThrow();
  });

  test('no lanza si saldo posterior es exactamente igual al límite', () => {
    // Límite = 10.000, saldo actual = 5.000, venta = 5.000 → saldo posterior = 10.000 ✓
    expect(() => validarLimiteCredito(5_000, 5_000, 10_000)).not.toThrow();
  });

  test('lanza cuando se excede el límite por un peso', () => {
    // Saldo actual = 9.999, venta = 2 → posterior = 10.001 > 10.000
    expect(() => validarLimiteCredito(9_999, 2, 10_000)).toThrow('Límite de crédito excedido');
  });

  test('el mensaje incluye los tres montos clave', () => {
    try {
      validarLimiteCredito(8_000, 3_000, 10_000);
      expect.fail('Debería haber lanzado un error');
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain('Límite');
      expect(msg).toContain('Saldo actual');
      expect(msg).toContain('sumaría');
    }
  });

  test('cliente con saldo cero compra dentro del límite', () => {
    expect(() => validarLimiteCredito(0, 5_000, 10_000)).not.toThrow();
  });

  test('cliente con saldo cero supera el límite', () => {
    expect(() => validarLimiteCredito(0, 15_000, 10_000)).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('calcularSaldoPostPago', () => {
  test('descuenta el pago del saldo', () => {
    expect(calcularSaldoPostPago(5_000, 1_000)).toBe(4_000);
  });

  test('pago total deja saldo en cero', () => {
    expect(calcularSaldoPostPago(1_000, 1_000)).toBe(0);
  });

  test('pago mayor a la deuda deja saldo negativo (crédito a favor)', () => {
    expect(calcularSaldoPostPago(500, 1_000)).toBe(-500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('calcularSaldoPostVenta', () => {
  test('suma la venta al saldo existente', () => {
    expect(calcularSaldoPostVenta(3_000, 2_000)).toBe(5_000);
  });

  test('desde saldo cero', () => {
    expect(calcularSaldoPostVenta(0, 1_500)).toBe(1_500);
  });
});
