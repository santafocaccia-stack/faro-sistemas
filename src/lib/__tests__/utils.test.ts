import { describe, test, expect } from 'vitest';
import { formatARS, formatKg } from '../utils';

describe('formatARS', () => {
  test('formatea miles con punto y decimales con coma (es-AR)', () => {
    expect(formatARS(1000)).toBe('$ 1.000');
    expect(formatARS(1234.56)).toBe('$ 1.234,56');
    expect(formatARS(0)).toBe('$ 0');
  });

  test('no muestra decimales en números enteros', () => {
    expect(formatARS(5000)).not.toContain(',00');
  });

  test('muestra decimales cuando los hay', () => {
    expect(formatARS(99.99)).toContain('99');
  });
});

describe('formatKg — regresión: no dividir por 1000', () => {
  test('8.5 kg se muestra como 8,500 kg (no 0,009)', () => {
    const resultado = formatKg(8.5);
    expect(resultado).toContain('8,500');
    expect(resultado).not.toContain('0,009');
  });

  test('1.35 kg se muestra como 1,350 kg', () => {
    expect(formatKg(1.35)).toContain('1,350');
  });

  test('valores pequeños no se convierten en cero', () => {
    const resultado = formatKg(0.046);
    expect(resultado).toContain('0,046');
  });

  test('siempre muestra exactamente 3 decimales', () => {
    expect(formatKg(10)).toContain('10,000');
    expect(formatKg(1.5)).toContain('1,500');
    expect(formatKg(0.1)).toContain('0,100');
  });

  test('siempre incluye la unidad "kg"', () => {
    expect(formatKg(5)).toContain('kg');
    expect(formatKg(0)).toContain('kg');
  });
});
