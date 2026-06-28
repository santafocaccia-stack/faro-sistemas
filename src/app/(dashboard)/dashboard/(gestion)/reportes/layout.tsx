import { requireCapacidad } from '@/server/auth/plan-guard';
import { requirePermiso } from '@/server/auth/session';

export default async function ReportesLayout({ children }: { children: React.ReactNode }) {
  await requireCapacidad('reportes');
  await requirePermiso('ver_reportes');
  return children;
}
