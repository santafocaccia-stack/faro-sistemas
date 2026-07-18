/**
 * Utilidades de fecha centralizadas.
 *
 * Dos problemas que esta capa resuelve de raíz:
 * 1. Suma de meses: JS hace `new Date(2026,0,31).setMonth(+1)` → 3-mar (overflow).
 *    `sumarMeses` clampea al último día del mes destino.
 * 2. Timezone: Argentina es UTC-3 y el server corre en UTC. "Hoy" debe calcularse
 *    sobre el calendario de Buenos Aires, no sobre la fecha UTC del runtime.
 */

const TZ_AR = 'America/Argentina/Buenos_Aires';

/**
 * Suma `n` meses calendario clampeando al último día del mes destino y
 * preservando la hora. Ej: 31-ene + 1 → 28/29-feb · 31-mar + 1 → 30-abr.
 * Acepta `n` negativo. No muta la fecha original.
 */
export function sumarMeses(base: Date, n: number): Date {
  const d = new Date(base);
  const dia = d.getDate();
  d.setDate(1); // evita el overflow al cambiar de mes
  d.setMonth(d.getMonth() + n);
  const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dia, ultimoDia));
  return d;
}

/**
 * "Hoy" según el calendario de Buenos Aires, a medianoche del runtime.
 * Pensado para comparar contra columnas `date` (que se parsean como medianoche
 * local con `new Date('YYYY-MM-DDT00:00:00')`): así el conteo de días entre
 * vencimiento y hoy es entero y no se corre por la diferencia UTC-3.
 */
/**
 * Formatea un timestamp según el calendario ARGENTINO.
 * Imprescindible en Server Components: el runtime corre en UTC, así que
 * `toLocaleDateString('es-AR')` a secas muestra el día corrido de noche
 * (a las 22hs AR ya es "mañana" en UTC).
 */
export function formatFechaAR(
  fecha: Date | string,
  opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
): string {
  return new Date(fecha).toLocaleDateString('es-AR', { ...opts, timeZone: TZ_AR });
}

export function hoyArgentina(): Date {
  const ar = new Date(new Date().toLocaleString('en-US', { timeZone: TZ_AR }));
  return new Date(ar.getFullYear(), ar.getMonth(), ar.getDate());
}
