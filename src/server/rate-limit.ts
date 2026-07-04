/**
 * Rate limiting simple en memoria (sliding window por clave+acción).
 *
 * Alcance: por instancia serverless. No es un límite global distribuido
 * (para eso haría falta Redis/Upstash), pero corta ráfagas y abuso básico
 * con costo cero. Las claves son `${accion}:${clave}` donde la clave es el
 * tenantId o userId de la sesión (server actions) — no dependemos de la IP,
 * que en Vercel puede rotar.
 *
 * Uso:
 *   const rl = rateLimit(`invitarMiembro:${session.tenantId}`, 10, 60 * 60_000);
 *   if (!rl.ok) return err('RATE_LIMIT', `Demasiados intentos. Probá en ${rl.retrySeg}s.`);
 */

type Ventana = number[]; // timestamps (ms) de los hits dentro de la ventana

const ventanas = new Map<string, Ventana>();

/** Poda global para que el Map no crezca sin límite en instancias longevas. */
const MAX_CLAVES = 10_000;

export function rateLimit(
  clave: string,
  maxIntentos: number,
  ventanaMs: number,
): { ok: boolean; restantes: number; retrySeg: number } {
  const ahora = Date.now();
  const desde = ahora - ventanaMs;

  const hits = ventanas.get(clave)?.filter((t) => t > desde) ?? [];

  if (hits.length >= maxIntentos) {
    const retrySeg = Math.ceil((hits[0]! + ventanaMs - ahora) / 1000);
    ventanas.set(clave, hits);
    return { ok: false, restantes: 0, retrySeg: Math.max(retrySeg, 1) };
  }

  hits.push(ahora);
  if (ventanas.size >= MAX_CLAVES && !ventanas.has(clave)) {
    // Descartar la clave más vieja (aprox FIFO por orden de inserción del Map)
    const primera = ventanas.keys().next().value;
    if (primera !== undefined) ventanas.delete(primera);
  }
  ventanas.set(clave, hits);
  return { ok: true, restantes: maxIntentos - hits.length, retrySeg: 0 };
}

/** Solo para tests: vacía el estado. */
export function _resetRateLimit() {
  ventanas.clear();
}
