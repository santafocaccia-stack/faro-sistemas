/**
 * Programación del balance mensual automático.
 *
 * El análisis del mes se genera solo en un día configurable. Por defecto, el
 * "último día hábil" del mes (lunes a viernes; no se contemplan feriados, para
 * mantenerlo simple y predecible). El negocio puede fijar otro día (1-28).
 *
 * Regla de qué mes "cierra" la corrida:
 *  - último día hábil, o un día tardío (>=16) → cierra el MES CORRIENTE.
 *  - un día temprano (<=15) → cierra el MES ANTERIOR (cierre a comienzo de mes).
 *
 * Todo el cálculo usa el calendario de Buenos Aires (la fecha "hoy" se pasa ya
 * convertida a ART por quien llama).
 */

/** Último día del mes (1-31) para year/monthIndex0 (0 = enero). */
export function ultimoDiaDelMes(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

/** Último día hábil (lun-vie) del mes, como número de día (1-31). */
export function ultimoDiaHabil(year: number, monthIndex0: number): number {
  let day = ultimoDiaDelMes(year, monthIndex0);
  // getUTCDay: 0 = domingo, 6 = sábado
  for (;;) {
    const dow = new Date(Date.UTC(year, monthIndex0, day)).getUTCDay();
    if (dow !== 0 && dow !== 6) return day;
    day -= 1;
  }
}

/**
 * Día del mes en que se debe generar el balance, según la config del tenant.
 * `dia` null → último día hábil. Un día fijo se acota a [1, último día del mes]
 * (un "31" en febrero corre el 28/29).
 */
export function diaGeneracion(year: number, monthIndex0: number, dia: number | null): number {
  if (dia == null) return ultimoDiaHabil(year, monthIndex0);
  const max = ultimoDiaDelMes(year, monthIndex0);
  return Math.min(Math.max(Math.trunc(dia), 1), max);
}

/** 'YYYY-MM' a partir de year/monthIndex0 (normaliza meses fuera de rango). */
function fmtMes(year: number, monthIndex0: number): string {
  const d = new Date(Date.UTC(year, monthIndex0, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Mes 'YYYY-MM' que cierra la corrida automática para esta config. */
export function mesObjetivoAuto(year: number, monthIndex0: number, dia: number | null): string {
  const cierraMesAnterior = dia != null && dia <= 15;
  return cierraMesAnterior ? fmtMes(year, monthIndex0 - 1) : fmtMes(year, monthIndex0);
}

/** Etiqueta legible de la programación, para la UI de config. */
export function etiquetaProgramacion(dia: number | null): string {
  if (dia == null) return 'el último día hábil del mes';
  return `el día ${dia} de cada mes`;
}
