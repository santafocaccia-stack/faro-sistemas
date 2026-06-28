import { requireCapacidad } from '@/server/auth/plan-guard';
import { requirePermiso } from '@/server/auth/session';

export default async function AtmosfericosLayout({ children }: { children: React.ReactNode }) {
  await requireCapacidad('atmosfericos');
  await requirePermiso('gestionar_atmosfericos');
  return <>{children}</>;
}
