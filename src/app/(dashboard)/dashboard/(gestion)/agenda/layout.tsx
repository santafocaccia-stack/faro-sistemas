import { requireCapacidad } from '@/server/auth/plan-guard';
import { requirePermiso } from '@/server/auth/session';

export default async function AgendaLayout({ children }: { children: React.ReactNode }) {
  await requireCapacidad('agenda');
  await requirePermiso('gestionar_presupuestos');
  return children;
}
