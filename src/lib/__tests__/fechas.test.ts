import { describe, it, expect } from 'vitest';
import { sumarMeses, hoyArgentina } from '@/lib/fechas';

describe('sumarMeses — clamp de fin de mes', () => {
  it('31-ene + 1 mes → 28-feb (año no bisiesto)', () => {
    const r = sumarMeses(new Date(2026, 0, 31), 1);
    expect(r.getFullYear()).toBe(2026);
    expect(r.getMonth()).toBe(1); // febrero
    expect(r.getDate()).toBe(28);
  });

  it('31-ene + 1 mes → 29-feb (año bisiesto 2024)', () => {
    const r = sumarMeses(new Date(2024, 0, 31), 1);
    expect(r.getMonth()).toBe(1);
    expect(r.getDate()).toBe(29);
  });

  it('31-mar + 1 mes → 30-abr (no se desborda a mayo)', () => {
    const r = sumarMeses(new Date(2026, 2, 31), 1);
    expect(r.getMonth()).toBe(3); // abril
    expect(r.getDate()).toBe(30);
  });

  it('31-dic + 1 mes → 31-ene del año siguiente', () => {
    const r = sumarMeses(new Date(2026, 11, 31), 1);
    expect(r.getFullYear()).toBe(2027);
    expect(r.getMonth()).toBe(0);
    expect(r.getDate()).toBe(31);
  });

  it('día que existe en ambos meses se preserva', () => {
    const r = sumarMeses(new Date(2026, 0, 15), 1);
    expect(r.getMonth()).toBe(1);
    expect(r.getDate()).toBe(15);
  });

  it('+12 meses cae el mismo día un año después', () => {
    const r = sumarMeses(new Date(2026, 0, 31), 12);
    expect(r.getFullYear()).toBe(2027);
    expect(r.getMonth()).toBe(0);
    expect(r.getDate()).toBe(31);
  });

  it('acepta n negativo (30-mar − 1 mes → 28-feb)', () => {
    const r = sumarMeses(new Date(2026, 2, 30), -1);
    expect(r.getMonth()).toBe(1);
    expect(r.getDate()).toBe(28);
  });

  it('preserva la hora y no muta la fecha original', () => {
    const base = new Date(2026, 0, 31, 14, 30, 0);
    const r = sumarMeses(base, 1);
    expect(r.getHours()).toBe(14);
    expect(r.getMinutes()).toBe(30);
    expect(base.getDate()).toBe(31); // original intacta
  });
});

describe('hoyArgentina', () => {
  it('devuelve una fecha válida a medianoche', () => {
    const h = hoyArgentina();
    expect(h).toBeInstanceOf(Date);
    expect(Number.isNaN(h.getTime())).toBe(false);
    expect(h.getHours()).toBe(0);
    expect(h.getMinutes()).toBe(0);
    expect(h.getSeconds()).toBe(0);
  });
});
