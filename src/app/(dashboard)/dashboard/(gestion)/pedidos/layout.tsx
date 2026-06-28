import { requireCapacidad } from '@/server/auth/plan-guard';
import { requirePermiso } from '@/server/auth/session';

export default async function PedidosLayout({ children }: { children: React.ReactNode }) {
  await requireCapacidad('compras');
  await requirePermiso('gestionar_proveedores');
  return children;
}
