import Link from 'next/link';
import { Plus, Receipt, ChevronRight } from 'lucide-react';
import { listarBoletas } from '@/server/actions/presupuestos';
import { formatARS } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta_debito: 'Débito',
  tarjeta_credito: 'Crédito',
  mercado_pago: 'Mercado Pago',
  cheque: 'Cheque',
  otro: 'Otro',
};

export default async function BoletasPage() {
  const boletas = await listarBoletas();

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-5xl mx-auto space-y-6 animate-fade-up">
      <PageHeader
        icon={Receipt}
        title="Boletas"
        subtitle="Comprobantes de cobro que entregás al cliente"
        action={
          <Button asChild className="glow-primary h-9">
            <Link href="/dashboard/boletas/nueva">
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Nueva boleta</span>
              <span className="sm:hidden">Nueva</span>
            </Link>
          </Button>
        }
      />

      {boletas.length === 0 ? (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-20 text-center">
          <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center mb-4">
            <Receipt className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Sin boletas todavía</p>
          <p className="text-xs text-muted-foreground mt-1 mb-5">
            Emití una boleta cuando cobres un trabajo
          </p>
          <Button asChild size="sm" className="glow-primary">
            <Link href="/dashboard/boletas/nueva">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Nueva boleta
            </Link>
          </Button>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          {/* Mobile: tarjetas */}
          <ul className="md:hidden divide-y divide-border/50 stagger">
            {boletas.map((b) => {
              const fecha = new Date(b.cobradoAt ?? new Date()).toLocaleDateString('es-AR', {
                day: '2-digit', month: '2-digit', year: '2-digit',
              });
              return (
                <li key={b.id}>
                  <Link href={`/dashboard/presupuestos/${b.id}`} className="list-row flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium truncate">{b.clienteDisplay}</p>
                      <p className="text-[11px] text-muted-foreground">
                        #{String(b.numero).padStart(5, '0')} · {fecha} · {METODO_LABEL[b.metodoCobro ?? ''] ?? '—'}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums text-[13px] font-semibold shrink-0">{formatARS(b.total)}</span>
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
                  <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 pl-4 w-20">#</TableHead>
                  <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Cliente</TableHead>
                  <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Fecha</TableHead>
                  <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Pago</TableHead>
                  <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 text-right pr-4">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {boletas.map((b) => {
                  const fecha = new Date(b.cobradoAt ?? new Date()).toLocaleDateString('es-AR', {
                    day: '2-digit', month: '2-digit', year: '2-digit',
                  });
                  return (
                    <TableRow
                      key={b.id}
                      className="relative hover:bg-white/[0.02] border-b border-border/40 last:border-0 cursor-pointer"
                    >
                      <TableCell className="pl-4 py-3">
                        <Link href={`/dashboard/presupuestos/${b.id}`} className="block font-mono text-xs text-muted-foreground hover:text-foreground transition-colors before:absolute before:inset-0 before:content-['']">
                          {String(b.numero).padStart(5, '0')}
                        </Link>
                      </TableCell>
                      <TableCell className="py-3">
                        <Link href={`/dashboard/presupuestos/${b.id}`} className="block text-[13px] font-medium hover:text-primary transition-colors">
                          {b.clienteDisplay}
                        </Link>
                      </TableCell>
                      <TableCell className="py-3 text-[13px] text-muted-foreground">{fecha}</TableCell>
                      <TableCell className="py-3 text-[13px] text-muted-foreground">{METODO_LABEL[b.metodoCobro ?? ''] ?? '—'}</TableCell>
                      <TableCell className="pr-4 py-3 text-right font-mono tabular-nums text-[13px] font-semibold">
                        {formatARS(b.total)}
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
