import { requireSession } from '@/server/auth/session';
import { listarProductos } from '@/server/actions/productos';
import { listarClientes } from '@/server/actions/clientes';
import { DashboardShell } from '@/components/dashboard-shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const [productos, clientes] = await Promise.all([
    listarProductos({ soloActivos: true }),
    listarClientes(),
  ]);

  return (
    <DashboardShell email={session.email} productos={productos} clientes={clientes}>
      {children}
    </DashboardShell>
  );
}
