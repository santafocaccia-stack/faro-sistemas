import { cache } from 'react';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/server/db';
import { usersTenants, tenants, type Rol } from '@/server/db/schema';
import type { PlanId, Capacidad } from '@/lib/planes';
import type { Permiso } from '@/lib/permisos';

export type Session = {
  userId: string;
  email: string;
  tenantId: string;
  tenantNombre: string;
  rol: Rol;
  permisos: Permiso[] | null;
  plan: PlanId;
  planFeatures: Partial<Record<Capacidad, boolean>> | null;
  status: 'trial' | 'activo' | 'moroso' | 'suspendido' | 'cancelado';
  trialEnd: Date | null;
};

type RequireSessionOpts = {
  allowExpired?: boolean;
};

/**
 * Obtiene la sesión del usuario autenticado.
 * Memoizado con react/cache() para que múltiples llamadas en el mismo
 * request tree (layout + page + server actions) ejecuten 1 sola vez.
 * Un JOIN reemplaza las 2 consultas secuenciales originales.
 */
const getSessionData = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();

  // getSession() lee la cookie local (sin round-trip a Supabase Auth).
  // getUser() hace una llamada de red (~100-300 ms) que sería cancelada
  // en cada server action. Para un sistema POS interno donde el tenant
  // aplica su propio aislamiento via byTenant(), esto es seguro.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;
  const user = session.user;

  // JOIN: una sola consulta en lugar de dos secuenciales
  const [row] = await db
    .select({
      tenantId:     usersTenants.tenantId,
      rol:          usersTenants.rol,
      permisos:     usersTenants.permisos,
      tenantNombre: tenants.nombre,
      status:       tenants.status,
      trialEnd:     tenants.trialEnd,
      plan:         tenants.plan,
      planFeatures: tenants.planFeatures,
    })
    .from(usersTenants)
    .innerJoin(tenants, eq(tenants.id, usersTenants.tenantId))
    .where(eq(usersTenants.userId, user.id))
    .limit(1);

  if (!row) return null;

  return {
    userId:       user.id,
    email:        user.email!,
    tenantId:     row.tenantId,
    tenantNombre: row.tenantNombre,
    rol:          row.rol,
    permisos:     row.permisos as Permiso[] | null,
    plan:         row.plan as PlanId,
    planFeatures: row.planFeatures as Partial<Record<Capacidad, boolean>> | null,
    status:       row.status,
    trialEnd:     row.trialEnd,
  };
});

export async function requireSession(opts?: RequireSessionOpts): Promise<Session> {
  const session = await getSessionData();

  if (!session) redirect('/login');

  if (!opts?.allowExpired) {
    const now = new Date();
    const trialExpired = session.status === 'trial' && session.trialEnd && session.trialEnd < now;
    const blocked = session.status === 'suspendido' || session.status === 'cancelado';
    if (trialExpired || blocked) redirect('/planes');
  }

  return session;
}

/** Pantalla principal del empleado según el plan (no todos tienen POS). */
const EMPLEADO_HOME: Record<PlanId, string> = {
  servicios:    '/dashboard/presupuestos',
  market:       '/dashboard/ventas',
  food:         '/dashboard/ventas',
  balanza:      '/dashboard/ventas',
  prestamista:  '/dashboard/prestamos',
  atmosfericos: '/dashboard/atmosfericos',
};

export async function requireRol(rolesPermitidos: Rol[]): Promise<Session> {
  const session = await requireSession();
  if (!rolesPermitidos.includes(session.rol)) {
    // Rol sin acceso (típicamente empleado) → su pantalla principal del plan.
    redirect(EMPLEADO_HOME[session.plan] ?? '/dashboard');
  }
  return session;
}

/**
 * Guard para páginas de gestión (owner + admin).
 * El rol 'empleado' es redirigido al POS — su única pantalla permitida.
 * Usar al inicio de cada page.tsx de gestión.
 */
export async function requireAdmin(): Promise<Session> {
  return requireRol(['owner', 'admin']);
}

/**
 * Guard granular por permiso.
 * Respeta overrides de permisos por usuario (users_tenants.permisos).
 * Redirige a la pantalla principal del plan si el usuario no tiene el permiso.
 */
export async function requirePermiso(permiso: import('@/lib/permisos').Permiso): Promise<Session> {
  const { tienePermiso } = await import('@/lib/permisos');
  const session = await requireSession();
  if (!tienePermiso(session, permiso)) {
    redirect(EMPLEADO_HOME[session.plan] ?? '/dashboard');
  }
  return session;
}
