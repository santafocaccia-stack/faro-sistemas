import { requireCapacidad } from '@/server/auth/plan-guard';

export default async function VentasLayout({ children }: { children: React.ReactNode }) {
  await requireCapacidad('pos');
  return children;
}
