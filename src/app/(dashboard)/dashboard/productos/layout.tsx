import { requireCapacidad } from '@/server/auth/plan-guard';

export default async function ProductosLayout({ children }: { children: React.ReactNode }) {
  await requireCapacidad('productos');
  return children;
}
