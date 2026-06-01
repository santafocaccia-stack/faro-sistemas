import { requireCapacidad } from '@/server/auth/plan-guard';

export default async function PrestamosLayout({ children }: { children: React.ReactNode }) {
  await requireCapacidad('prestamos');
  return children;
}
