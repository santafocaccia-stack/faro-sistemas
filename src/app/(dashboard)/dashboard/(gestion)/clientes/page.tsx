import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import { listarClientes } from '@/server/actions/clientes';
import { requireSession } from '@/server/auth/session';
import { PageHeader } from '@/components/ui/page-header';
import { ClientesListaClient } from '@/components/clientes-lista-client';

export default async function ClientesPage() {
  const [clientes, session] = await Promise.all([listarClientes(), requireSession()]);
  const esAtmos = session.plan === 'atmosfericos';
  const conDeuda = clientes.filter((c) => Number(c.saldoActual) > 0).length;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-6xl mx-auto space-y-6 animate-fade-up">

      {/* Header */}
      <PageHeader
        icon={Users}
        title="Clientes"
        subtitle={
          <>
            {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'}
            {!esAtmos && conDeuda > 0 && <span className="text-destructive"> · {conDeuda} con deuda</span>}
          </>
        }
        action={
          <Link
            href="/dashboard/clientes/nuevo"
            className="glow-primary inline-flex items-center gap-1.5 px-4 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-all"
          >
            <Plus className="h-5 w-5" strokeWidth={2.25} />
            <span className="hidden sm:inline">Nuevo cliente</span>
            <span className="sm:hidden">Nuevo</span>
          </Link>
        }
      />

      {clientes.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-14 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mx-auto mb-4 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium mb-1">Sin clientes registrados</p>
          <p className="text-xs text-muted-foreground mb-5 max-w-sm mx-auto">
            {esAtmos
              ? 'Guardá los clientes frecuentes para pre-cargar su dirección y litros del pozo en cada pedido.'
              : 'Cargá los clientes frecuentes para asociarlos a las ventas y la cuenta corriente.'}
          </p>
          <Link
            href="/dashboard/clientes/nuevo"
            className="inline-flex items-center gap-2 px-4 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all glow-primary"
          >
            <Plus className="h-4 w-4" strokeWidth={2.25} />
            Cargar primer cliente
          </Link>
        </div>
      ) : (
        <ClientesListaClient clientes={clientes} esAtmos={esAtmos} />
      )}
    </div>
  );
}
