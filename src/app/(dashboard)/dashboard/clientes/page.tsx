import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import { listarClientes } from '@/server/actions/clientes';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
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
    <div className="px-6 lg:px-10 py-8 max-w-6xl mx-auto space-y-8 animate-fade-up">

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'} registrados
            {conDeuda > 0 && (
              <span className="text-destructive"> · {conDeuda} con deuda</span>
            )}
          </p>
        </div>
        <Link
          href="/dashboard/clientes/nuevo"
          className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 transition-all glow-primary"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
          Nuevo cliente
        </Link>
      </div>

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
        <div className="rounded-xl border border-border bg-card overflow-hidden">
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
      )}
    </div>
  );
}
