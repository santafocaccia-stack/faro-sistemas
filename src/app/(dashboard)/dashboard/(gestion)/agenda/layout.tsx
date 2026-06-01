import { requireCapacidad } from '@/server/auth/plan-guard';

export default async function AgendaLayout({ children }: { children: React.ReactNode }) {
  await requireCapacidad('agenda');
  return children;
}
