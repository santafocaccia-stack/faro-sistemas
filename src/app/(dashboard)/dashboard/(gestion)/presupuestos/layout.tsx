import { requireCapacidad } from '@/server/auth/plan-guard';

export default async function PresupuestosLayout({ children }: { children: React.ReactNode }) {
  await requireCapacidad('presupuestos');
  return children;
}
