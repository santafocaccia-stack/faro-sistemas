import { notFound } from 'next/navigation';
import { planTiene, type Capacidad } from '@/lib/planes';
import { requireSession, type Session } from './session';

/**
 * Guard de capacidad por plan. Se usa en los layout.tsx de cada sección
 * para que un plan NO pueda abrir rutas que no le corresponden, ni siquiera
 * escribiendo la URL a mano (la navegación las oculta, esto las cierra).
 *
 * Si el plan no tiene la capacidad → 404 (notFound), igual que una ruta inexistente.
 */
export async function requireCapacidad(cap: Capacidad): Promise<Session> {
  const session = await requireSession();
  if (!planTiene(session.plan, cap)) notFound();
  return session;
}
