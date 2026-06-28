import { requirePermiso } from '@/server/auth/session';

export default async function BoletasLayout({ children }: { children: React.ReactNode }) {
  await requirePermiso('gestionar_presupuestos');
  return <>{children}</>;
}
