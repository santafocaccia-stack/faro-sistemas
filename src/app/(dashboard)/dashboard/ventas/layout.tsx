import { requireCapacidad } from '@/server/auth/plan-guard';
import { requirePermiso } from '@/server/auth/session';

export default async function VentasLayout({ children }: { children: React.ReactNode }) {
  await requireCapacidad('pos');
  await requirePermiso('usar_pos');
  return children;
}
