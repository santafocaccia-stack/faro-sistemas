import { requireCapacidad } from '@/server/auth/plan-guard';

export default async function CuentaCorrienteLayout({ children }: { children: React.ReactNode }) {
  await requireCapacidad('cuentaCorriente');
  return children;
}
