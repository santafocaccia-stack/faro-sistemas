import { requireCapacidad } from '@/server/auth/plan-guard';
import { requirePermiso } from '@/server/auth/session';

export default async function PrestamosLayout({ children }: { children: React.ReactNode }) {
  await requireCapacidad('prestamos');
  await requirePermiso('gestionar_prestamos');
  return children;
}
