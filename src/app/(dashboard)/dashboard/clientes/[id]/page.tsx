import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, BookOpen } from 'lucide-react';
import { obtenerCliente } from '@/server/actions/clientes';
import { ClienteForm } from '@/components/cliente-form';
import { formatARS } from '@/lib/utils';

const tipoLabel: Record<string, string> = {
  mayorista: 'Mayorista',
  minorista: 'Minorista',
  ambos: 'Ambos',
};

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = await obtenerCliente(id);
  if (!cliente) notFound();

  const saldo = Number(cliente.saldoActual);

  return (
    <div className="px-6 lg:px-10 py-8 max-w-3xl mx-auto space-y-8 animate-fade-up">

      <Link
        href="/dashboard/clientes"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Clientes
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border border-border bg-muted text-muted-foreground">
              {tipoLabel[cliente.tipo]}
            </span>
            {cliente.esConsumidorFinal && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border border-border bg-muted text-muted-foreground">
                Consumidor final
              </span>
            )}
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight leading-tight">{cliente.razonSocial}</h1>
          {cliente.nombreFantasia && (
            <p className="text-sm text-muted-foreground mt-1">{cliente.nombreFantasia}</p>
          )}
        </div>

        {cliente.habilitaCuentaCorriente && (
          <Link
            href={`/dashboard/cc/${cliente.id}`}
            className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-card/60 transition-colors group flex items-center gap-3"
          >
            <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Saldo deudor</p>
              <p className={`font-mono tabular-nums text-base font-semibold ${saldo > 0 ? 'text-destructive' : 'text-success'}`}>
                {formatARS(saldo)}
              </p>
            </div>
          </Link>
        )}
      </div>

      <ClienteForm cliente={cliente} />
    </div>
  );
}
