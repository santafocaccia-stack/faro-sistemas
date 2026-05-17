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

export async function requireSession(opts?: RequireSessionOpts): Promise<Session> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const memberships = await db
    .select()
    .from(usersTenants)
    .where(eq(usersTenants.userId, user.id))
    .limit(1);

  const membership = memberships[0];
  if (!membership) redirect('/onboarding');

  const [tenant] = await db
    .select({
      nombre: tenants.nombre,
      status: tenants.status,
      trialEnd: tenants.trialEnd,
      plan: tenants.plan,
    })
    .from(tenants)
    .where(eq(tenants.id, membership.tenantId))
    .limit(1);

  if (!tenant) redirect('/onboarding');

  if (!opts?.allowExpired) {
    const now = new Date();
    const trialExpired = tenant.status === 'trial' && tenant.trialEnd && tenant.trialEnd < now;
    const blocked = tenant.status === 'suspendido' || tenant.status === 'cancelado';
    if (trialExpired || blocked) redirect('/planes');
  }

  return {
    userId: user.id,
    email: user.email!,
    tenantId: membership.tenantId,
    tenantNombre: tenant.nombre,
    rol: membership.rol,
    plan: tenant.plan as PlanId,
    status: tenant.status,
    trialEnd: tenant.trialEnd,
  };
}

export async function requireRol(rolesPermitidos: Rol[]): Promise<Session> {
  const session = await requireSession();
  if (!rolesPermitidos.includes(session.rol)) {
    redirect('/sin-permiso');
  }
  return session;
}
