import Link from 'next/link';
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

  const diasRestantes = session.trialEnd
    ? Math.ceil((new Date(session.trialEnd).getTime() - Date.now()) / 86_400_000)
    : null;

  const mostrarBanner = session.status === 'trial' && diasRestantes !== null && diasRestantes <= 7;

  return (
    <>
      {mostrarBanner && (
        <div className="w-full bg-warning/10 border-b border-warning/20 px-4 py-2 flex items-center justify-between gap-4 text-sm">
          <p className="text-warning font-medium">
            {diasRestantes <= 0
              ? 'Tu prueba gratuita venció.'
              : `Tu prueba gratuita vence en ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}.`}
          </p>
          <Link
            href="/planes"
            className="shrink-0 px-3 h-7 rounded-lg bg-warning text-warning-foreground text-xs font-semibold hover:brightness-110 transition-all inline-flex items-center"
          >
            Ver planes
          </Link>
        </div>
      )}
      <DashboardShell
        email={session.email}
        plan={session.plan}
        tenantNombre={session.tenantNombre}
        productos={productos}
        clientes={clientes}
      >
        {children}
      </DashboardShell>
    </>
  );
}
