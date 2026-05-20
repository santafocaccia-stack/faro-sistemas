import { cache } from 'react';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/server/db';
import { usersTenants, tenants, type Rol } from '@/server/db/schema';
import type { PlanId } from '@/lib/planes';

export type Session = {
  userId: string;
  email: string;
  tenantId: string;
  tenantNombre: string;
  rol: Rol;
  plan: PlanId;
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // JOIN: una sola consulta en lugar de dos secuenciales
  const [row] = await db
    .select({
      tenantId:     usersTenants.tenantId,
      rol:          usersTenants.rol,
      tenantNombre: tenants.nombre,
      status:       tenants.status,
      trialEnd:     tenants.trialEnd,
      plan:         tenants.plan,
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
    plan:         row.plan as PlanId,
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

export async function requireRol(rolesPermitidos: Rol[]): Promise<Session> {
  const session = await requireSession();
  if (!rolesPermitidos.includes(session.rol)) {
    redirect('/sin-permiso');
  }
  return session;
}
