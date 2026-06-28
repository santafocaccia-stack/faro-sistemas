import { requireCapacidad } from '@/server/auth/plan-guard';
import { requirePermiso } from '@/server/auth/session';

export default async function ProductosLayout({ children }: { children: React.ReactNode }) {
  await requireCapacidad('productos');
  await requirePermiso('gestionar_productos');
  return children;
}
