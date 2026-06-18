import { requireCapacidad } from '@/server/auth/plan-guard';

export default async function AtmosfericosLayout({ children }: { children: React.ReactNode }) {
  await requireCapacidad('atmosfericos');
  return <>{children}</>;
}
