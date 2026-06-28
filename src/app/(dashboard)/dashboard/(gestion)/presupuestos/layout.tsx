import { requireCapacidad } from '@/server/auth/plan-guard';
import { requirePermiso } from '@/server/auth/session';

export default async function PresupuestosLayout({ children }: { children: React.ReactNode }) {
  await requireCapacidad('presupuestos');
  await requirePermiso('gestionar_presupuestos');
  return children;
}
