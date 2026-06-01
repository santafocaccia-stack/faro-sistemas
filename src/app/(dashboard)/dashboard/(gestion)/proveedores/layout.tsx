import { requireCapacidad } from '@/server/auth/plan-guard';

export default async function ProveedoresLayout({ children }: { children: React.ReactNode }) {
  await requireCapacidad('compras');
  return children;
}
