/**
 * Helper de idempotencia para operaciones financieras críticas.
 *
 * Uso en un server action:
 *
 *   const cached = await checkIdempotency(session.tenantId, idempotencyKey, 'crearVenta');
 *   if (cached) return cached as ReturnType<typeof crearVenta>;
 *
 *   // ... ejecutar la operación ...
 *
 *   await saveIdempotency(session.tenantId, idempotencyKey, 'crearVenta', resultado);
 *   return resultado;
 */
import { eq, and, gt } from 'drizzle-orm';
import { db } from '@/server/db';
import { idempotencyKeys } from '@/server/db/schema';

const TTL_HORAS = 24;

/** Devuelve el resultado cacheado si el key ya fue procesado, o null si es nuevo. */
export async function checkIdempotency(
  tenantId: string,
  key: string,
  operacion: string,
): Promise<unknown | null> {
  if (!key) return null;
  const now = new Date();
  const [row] = await db
    .select({ resultado: idempotencyKeys.resultado })
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.tenantId, tenantId),
        eq(idempotencyKeys.key, key),
        eq(idempotencyKeys.operacion, operacion),
        gt(idempotencyKeys.expiraAt, now),
      ),
    )
    .limit(1);

  return row?.resultado ?? null;
}

/** Guarda el resultado de una operación para futuros requests con el mismo key. */
export async function saveIdempotency(
  tenantId: string,
  key: string,
  operacion: string,
  resultado: unknown,
): Promise<void> {
  if (!key) return;
  const expiraAt = new Date(Date.now() + TTL_HORAS * 60 * 60 * 1000);
  try {
    await db
      .insert(idempotencyKeys)
      .values({ tenantId, key, operacion, resultado: resultado as never, expiraAt })
      .onConflictDoNothing();
  } catch {
    // Si ya existe (race condition), ignorar — el primer insert ganó
  }
}
