/**
 * Helper para registrar eventos en audit_logs.
 * Uso desde server actions:
 *
 *   await audit(session, 'venta.crear', 'venta', venta.id, { after: venta });
 *
 * No lanza si falla — el audit log nunca debe interrumpir la operación principal.
 */
import { db } from '@/server/db';
import { auditLogs, type AuditAccion } from '@/server/db/schema';
import type { Session } from '@/server/auth/session';

type AuditOpts = {
  before?: unknown;
  after?: unknown;
  meta?: Record<string, unknown>;
};

export async function audit(
  session: Pick<Session, 'tenantId' | 'userId'>,
  accion: AuditAccion,
  entidad: string,
  entidadId: string | undefined,
  opts: AuditOpts = {},
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      tenantId:  session.tenantId,
      userId:    session.userId,
      accion,
      entidad,
      entidadId: entidadId ?? undefined,
      before:    opts.before ?? null,
      after:     opts.after  ?? null,
      meta:      opts.meta   ?? null,
    });
  } catch {
    // Audit log nunca interrumpe la operación principal
  }
}
