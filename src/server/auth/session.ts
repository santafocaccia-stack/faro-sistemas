/**
 * Helpers de autenticación y sesión para el server-side.
 *
 * Patrón estándar de uso:
 *   const session = await requireSession();
 *   // session.user — datos del usuario
 *   // session.tenantId — tenant activo del usuario
 *
 * Si no hay sesión o tenant, redirige a /login.
 */
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/server/db';
import { usersTenants, type Rol } from '@/server/db/schema';

export type Session = {
  userId: string;
  email: string;
  tenantId: string;
  rol: Rol;
};

/**
 * Devuelve la sesión activa o redirige a login si no hay.
 * Usar en Server Components, Server Actions y Route Handlers protegidos.
 */
export async function requireSession(): Promise<Session> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Buscar el tenant activo del usuario.
  // En v1 asumimos que un usuario tiene un solo tenant. Si tuviera varios,
  // habría que mantener un "tenant activo" en cookie/preferencia.
  const memberships = await db
    .select()
    .from(usersTenants)
    .where(eq(usersTenants.userId, user.id))
    .limit(1);

  const membership = memberships[0];
  if (!membership) {
    // Usuario sin tenant — pasar por flow de onboarding
    redirect('/onboarding');
  }

  return {
    userId: user.id,
    email: user.email!,
    tenantId: membership.tenantId,
    rol: membership.rol,
  };
}

/**
 * Como requireSession pero también verifica un rol mínimo.
 * Útil en endpoints que solo admins/owners pueden ejecutar.
 */
export async function requireRol(rolesPermitidos: Rol[]): Promise<Session> {
  const session = await requireSession();
  if (!rolesPermitidos.includes(session.rol)) {
    redirect('/sin-permiso');
  }
  return session;
}
