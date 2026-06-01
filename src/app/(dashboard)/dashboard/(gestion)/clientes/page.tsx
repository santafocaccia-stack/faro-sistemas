import Link from 'next/link';
import { Plus, Users, ChevronRight } from 'lucide-react';
import { listarClientes } from '@/server/actions/clientes';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/ui/page-header';
import { formatARS } from '@/lib/utils';

const tipoLabel: Record<string, string> = {
  mayorista: 'Mayorista',
  minorista: 'Minorista',
  ambos: 'Ambos',
};

export default async function ClientesPage() {
  const clientes = await listarClientes();
  const conDeuda = clientes.filter((c) => Number(c.saldoActual) > 0).length;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-6xl mx-auto space-y-8 animate-fade-up">

      {/* Header */}
      <PageHeader
        icon={Users}
        title="Clientes"
        subtitle={
          <>
            {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'}
            {conDeuda > 0 && <span className="text-destructive"> · {conDeuda} con deuda</span>}
          </>
        }
        action={
          <Link
            href="/dashboard/clientes/nuevo"
            className="glow-primary inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold transition-all"
          >
            <Plus className="h-4 w-4" strokeWidth={2.25} />
            <span className="hidden sm:inline">Nuevo cliente</span>
            <span className="sm:hidden">Nuevo</span>
          </Link>
        }
      />

      {clientes.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-14 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/8 border border-primary/15 mx-auto mb-4 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium mb-1">Sin clientes registrados</p>
          <p className="text-xs text-muted-foreground mb-5 max-w-sm mx-auto">
            Cargá los clientes mayoristas y minoristas frecuentes para asociarlos a las ventas y la cuenta corriente.
          </p>
          <Link
            href="/dashboard/clientes/nuevo"
            className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 transition-all glow-primary"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
            Cargar primer cliente
          </Link>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          {/* Mobile: tarjetas */}
          <ul className="md:hidden divide-y divide-border/50 stagger">
            {clientes.map((c) => {
              const saldo = Number(c.saldoActual);
              return (
                <li key={c.id}>
                  <Link href={`/dashboard/clientes/${c.id}`} className="list-row flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium truncate">{c.razonSocial}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {tipoLabel[c.tipo]}
                        {c.telefono ? ` · ${c.telefono}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className={`font-mono tabular-nums text-[13px] ${saldo > 0 ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                        {formatARS(saldo)}
                      </span>
                      {c.habilitaCuentaCorriente && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" /> Cta. cte.
                        </span>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Desktop: tabla */}
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/60">
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 pl-4">Razón social</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Tipo</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Contacto</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Cond. IVA</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 text-right">Saldo</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 pr-4">Cta. cte.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => {
                const saldo = Number(c.saldoActual);
                return (
                  <TableRow key={c.id} className="hover:bg-white/[0.02] border-b border-border/40 last:border-0 cursor-pointer group">
                    <TableCell className="pl-4 py-2.5">
                      <Link href={`/dashboard/clientes/${c.id}`} className="block">
                        <p className="text-[13px] font-medium">{c.razonSocial}</p>
                        {c.nombreFantasia && (
                          <p className="text-[11px] text-muted-foreground">{c.nombreFantasia}</p>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border border-border bg-muted text-muted-foreground">
                        {tipoLabel[c.tipo]}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-muted-foreground">
                      {c.telefono ?? c.email ?? <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-muted-foreground capitalize">
                      {c.condicionIva.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <span className={`font-mono tabular-nums text-[13px] ${saldo > 0 ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                        {formatARS(saldo)}
                      </span>
                    </TableCell>
                    <TableCell className="pr-4 py-2.5">
                      {c.habilitaCuentaCorriente ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          Habilitada
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">No</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </div>
      )}
    </div>
  );
}
