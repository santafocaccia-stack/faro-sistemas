import { requireCapacidad } from '@/server/auth/plan-guard';

export default async function ReportesLayout({ children }: { children: React.ReactNode }) {
  await requireCapacidad('reportes');
  return children;
}
