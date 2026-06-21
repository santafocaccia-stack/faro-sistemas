import { and, desc, eq, isNull, inArray } from 'drizzle-orm';
import { db } from '@/server/db';
import { tenants, users, usersTenants, pagosSuscripcion } from '@/server/db/schema';
import { PLANES } from '@/lib/planes';
import { SuscripcionesClient, type PagoPendiente, type TenantRow } from './suscripciones-client';

export const dynamic = 'force-dynamic';

export default async function AdminSuscripcionesPage() {
  // ── Tenants (no borrados) ──────────────────────────────────────────────────
  const tenantsRows = await db
    .select({
      id: tenants.id,
      nombre: tenants.nombre,
      plan: tenants.plan,
      status: tenants.status,
      trialEnd: tenants.trialEnd,
      subscriptionEnd: tenants.subscriptionEnd,
      createdAt: tenants.createdAt,
    })
    .from(tenants)
    .where(isNull(tenants.deletedAt))
    .orderBy(desc(tenants.createdAt));

  const tenantIds = tenantsRows.map((t) => t.id);

  // ── Email del owner de cada tenant ─────────────────────────────────────────
  const ownerRows = tenantIds.length
    ? await db
        .select({ tenantId: usersTenants.tenantId, email: users.email })
        .from(usersTenants)
        .innerJoin(users, eq(users.id, usersTenants.userId))
        .where(and(inArray(usersTenants.tenantId, tenantIds), eq(usersTenants.rol, 'owner')))
    : [];
  const ownerByTenant = new Map(ownerRows.map((r) => [r.tenantId, r.email]));

  // ── Pagos avisados (pendientes de confirmar) ───────────────────────────────
  const pendientesRows = await db
    .select({
      id: pagosSuscripcion.id,
      tenantId: pagosSuscripcion.tenantId,
      tenantNombre: tenants.nombre,
      plan: pagosSuscripcion.plan,
      montoArs: pagosSuscripcion.montoArs,
      avisadoEn: pagosSuscripcion.avisadoEn,
    })
    .from(pagosSuscripcion)
    .innerJoin(tenants, eq(tenants.id, pagosSuscripcion.tenantId))
    .where(eq(pagosSuscripcion.estado, 'avisado'))
    .orderBy(desc(pagosSuscripcion.avisadoEn));

  const pendientes: PagoPendiente[] = pendientesRows.map((p) => ({
    pagoId: p.id,
    tenantId: p.tenantId,
    tenantNombre: p.tenantNombre,
    email: ownerByTenant.get(p.tenantId) ?? '—',
    plan: p.plan,
    planNombre: PLANES[p.plan].nombre,
    montoArs: Number(p.montoArs),
    avisadoEn: p.avisadoEn.toISOString(),
  }));

  const filas: TenantRow[] = tenantsRows.map((t) => ({
    id: t.id,
    nombre: t.nombre,
    email: ownerByTenant.get(t.id) ?? '—',
    plan: t.plan,
    planNombre: PLANES[t.plan].nombre,
    status: t.status,
    trialEnd: t.trialEnd?.toISOString() ?? null,
    subscriptionEnd: t.subscriptionEnd?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  }));

  return <SuscripcionesClient pendientes={pendientes} tenants={filas} />;
}
