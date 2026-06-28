import { requireCapacidad } from '@/server/auth/plan-guard';
import { requirePermiso } from '@/server/auth/session';

export default async function CuentaCorrienteLayout({ children }: { children: React.ReactNode }) {
  await requireCapacidad('cuentaCorriente');
  await requirePermiso('gestionar_cc');
  return children;
}
