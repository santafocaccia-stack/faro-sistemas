/**
 * Guard de super-admin (dueño de la plataforma Gesto, NO de un tenant).
 *
 * El super-admin se identifica por email vía la env var SUPER_ADMIN_EMAILS
 * (lista separada por comas). No hay flag en DB ni rol nuevo: es un control
 * de plataforma, ortogonal al multi-tenant. Sirve para el panel /admin
 * (gestionar suscripciones, confirmar pagos por transferencia, etc.).
 */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function emailsAutorizados(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** ¿Este email es super-admin de la plataforma? */
export function esSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return emailsAutorizados().includes(email.toLowerCase());
}

export type SuperAdmin = { userId: string; email: string };

/**
 * Exige que el usuario autenticado sea super-admin.
 * Redirige a /dashboard si está logueado pero no es super-admin (no revela
 * la existencia del panel), o a /login si no hay sesión.
 */
export async function requireSuperAdmin(): Promise<SuperAdmin> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (!esSuperAdmin(user.email)) redirect('/dashboard');

  return { userId: user.id, email: user.email! };
}
