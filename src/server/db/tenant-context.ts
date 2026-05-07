/**
 * Tenant Context — helpers para garantizar que TODA query tiene
 * el filtro `tenant_id` aplicado.
 *
 * Patrón de uso:
 *
 *   const session = await requireSession();
 *   const data = await db
 *     .select()
 *     .from(productos)
 *     .where(byTenant(session.tenantId, productos));
 *
 * Postgres RLS es la red de seguridad complementaria, configurada en la
 * migration de bootstrap. Pero el código de aplicación SIEMPRE filtra
 * explícitamente — no se delega solo a RLS.
 */
import { eq, and, type SQL, type AnyColumn } from 'drizzle-orm';
import { type PgTable } from 'drizzle-orm/pg-core';

/**
 * Devuelve un WHERE clause que filtra por tenant_id.
 * La tabla DEBE tener una columna `tenantId`.
 */
export function byTenant<T extends PgTable & { tenantId: AnyColumn }>(
  tenantId: string,
  table: T,
): SQL {
  return eq(table.tenantId, tenantId);
}

/**
 * Combina byTenant con condiciones adicionales.
 *
 *   .where(byTenantAnd(session.tenantId, productos, eq(productos.activo, true)))
 */
export function byTenantAnd<T extends PgTable & { tenantId: AnyColumn }>(
  tenantId: string,
  table: T,
  ...extra: (SQL | undefined)[]
): SQL {
  return and(eq(table.tenantId, tenantId), ...extra)!;
}
