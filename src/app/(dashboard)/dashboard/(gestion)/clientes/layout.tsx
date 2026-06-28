import { requirePermiso } from '@/server/auth/session';

export default async function ClientesLayout({ children }: { children: React.ReactNode }) {
  await requirePermiso('gestionar_clientes');
  return <>{children}</>;
}
