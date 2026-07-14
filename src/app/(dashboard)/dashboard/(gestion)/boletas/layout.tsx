import { requireCapacidad } from '@/server/auth/plan-guard';
import { requirePermiso } from '@/server/auth/session';

export default async function BoletasLayout({ children }: { children: React.ReactNode }) {
  // Las boletas son del plan servicios (capacidad presupuestos). Sin este guard
  // un owner de otro plan podía abrir /dashboard/boletas por URL (permisos de
  // owner = todos, sin mirar el plan). Igual que agenda/presupuestos.
  await requireCapacidad('presupuestos');
  await requirePermiso('gestionar_presupuestos');
  return <>{children}</>;
}
