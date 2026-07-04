import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { rateLimit, _resetRateLimit } from '../rate-limit';

describe('rateLimit (sliding window en memoria)', () => {
  beforeEach(() => {
    _resetRateLimit();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('permite hasta el máximo y bloquea el siguiente', () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimit('x:t1', 3, 60_000).ok).toBe(true);
    }
    const r = rateLimit('x:t1', 3, 60_000);
    expect(r.ok).toBe(false);
    expect(r.retrySeg).toBeGreaterThan(0);
  });

  it('la ventana desliza: pasado el tiempo vuelve a permitir', () => {
    for (let i = 0; i < 3; i++) rateLimit('x:t1', 3, 60_000);
    expect(rateLimit('x:t1', 3, 60_000).ok).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(rateLimit('x:t1', 3, 60_000).ok).toBe(true);
  });

  it('claves independientes no se afectan entre sí', () => {
    for (let i = 0; i < 3; i++) rateLimit('x:t1', 3, 60_000);
    expect(rateLimit('x:t1', 3, 60_000).ok).toBe(false);
    expect(rateLimit('x:t2', 3, 60_000).ok).toBe(true);
    expect(rateLimit('y:t1', 3, 60_000).ok).toBe(true);
  });

  it('restantes decrece correctamente', () => {
    expect(rateLimit('x:t1', 3, 60_000).restantes).toBe(2);
    expect(rateLimit('x:t1', 3, 60_000).restantes).toBe(1);
    expect(rateLimit('x:t1', 3, 60_000).restantes).toBe(0);
  });
});
