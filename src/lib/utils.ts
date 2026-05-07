import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina clases de Tailwind con conflict resolution.
 * Estándar de shadcn/ui — usar siempre que se necesite componer clases dinámicamente.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea un monto en pesos argentinos.
 */
export function formatARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatea un monto en USD.
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatea peso (kg) con coma decimal argentina.
 */
export function formatKg(grams: number): string {
  return `${(grams / 1000).toLocaleString('es-AR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`;
}
