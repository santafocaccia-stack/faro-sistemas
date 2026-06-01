import Link from 'next/link';
import { ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { listarVentas } from '@/server/actions/ventas';
import { formatARS } from '@/lib/utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const estadoBadge: Record<string, { label: string; className: string }> = {
  pagada:    { label: 'Pagada',    className: 'bg-success/15 text-success border-success/20' },
  pendiente: { label: 'Pendiente', className: 'bg-warning/15 text-warning border-warning/20' },
  parcial:   { label: 'Parcial',   className: 'bg-muted text-muted-foreground border-border' },
  anulada:   { label: 'Anulada',   className: 'bg-destructive/15 text-destructive border-destructive/20' },
};

type Canal = 'minorista' | 'mayorista';

type Props = { searchParams: Promise<{ canal?: string; page?: string }> };

export default async function HistorialPage({ searchParams }: Props) {
  const { canal: canalParam, page: pageParam } = await searchParams;
  const canal: Canal = canalParam === 'mayorista' ? 'mayorista' : 'minorista';
  const page = Math.max(0, parseInt(pageParam ?? '0', 10) || 0);

  const { rows, hayMas } = await listarVentas(canal, page);

  const buildHref = (p: number) =>
    `/dashboard/ventas/historial?canal=${canal}&page=${p}`;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-6xl mx-auto space-y-8 animate-fade-up">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Historial</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rows.length === 0 ? 'Sin ventas' : `Página ${page + 1}`}
          </p>
        </div>

        {/* Tabs canal — pill style */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <Link
            href="/dashboard/ventas/historial?canal=minorista"
            className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 ${
              canal === 'minorista'
                ? 'bg-card text-foreground shadow-[0_1px_2px_oklch(0_0_0_/_0.3)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Minorista
          </Link>
          <Link
            href="/dashboard/ventas/historial?canal=mayorista"
            className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 ${
              canal === 'mayorista'
                ? 'bg-card text-foreground shadow-[0_1px_2px_oklch(0_0_0_/_0.3)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Mayorista
          </Link>
        </div>
      </div>

      {rows.length === 0 && page === 0 ? (
        <div className="rounded-xl border border-border bg-card p-14 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/8 border border-primary/15 mx-auto mb-4 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-primary" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium mb-1">Sin ventas en este canal</p>
          <p className="text-xs text-muted-foreground mb-5 max-w-sm mx-auto">
            Las ventas que registres en el punto de venta van a aparecer acá.
          </p>
          <Link
            href="/dashboard/ventas"
            className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 transition-all glow-primary"
          >
            <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2.25} />
            Ir al punto de venta
          </Link>
        </div>
      ) : (
        <>
          <div className="panel overflow-hidden">
            {/* Mobile: tarjetas */}
            <ul className="md:hidden divide-y divide-border/50 stagger">
              {rows.map(({ venta, clienteNombre }) => {
                const badge = estadoBadge[venta.estado] ?? { label: venta.estado, className: 'bg-muted text-muted-foreground' };
                return (
                  <li key={venta.id}>
                    <Link href={`/dashboard/ventas/historial/${venta.id}`} className="list-row flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium truncate">{clienteNombre ?? 'Consumidor final'}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          #{venta.numero} · {new Date(venta.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="font-mono tabular-nums text-[13px] font-semibold">{formatARS(Number(venta.total))}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border uppercase tracking-wide ${badge.className}`}>{badge.label}</span>
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
                  <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 w-20 pl-4">Núm.</TableHead>
                  <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Fecha</TableHead>
                  <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Cliente</TableHead>
                  <TableHead className="hidden sm:table-cell h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Tipo pago</TableHead>
                  <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Estado</TableHead>
                  <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 text-right pr-4">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ venta, clienteNombre }) => {
                  const badge = estadoBadge[venta.estado] ?? { label: venta.estado, className: 'bg-muted text-muted-foreground' };
                  return (
                    <TableRow key={venta.id} className="hover:bg-white/[0.02] border-b border-border/40 last:border-0 cursor-pointer group">
                      <TableCell className="pl-4 py-2.5">
                        <Link href={`/dashboard/ventas/historial/${venta.id}`} className="block font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                          #{venta.numero}
                        </Link>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-muted-foreground font-mono tabular-nums">
                        {new Date(venta.fecha).toLocaleDateString('es-AR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Link href={`/dashboard/ventas/historial/${venta.id}`} className="block text-[13px] font-medium">
                          {clienteNombre ?? '—'}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell py-2.5 text-xs text-muted-foreground capitalize">
                        {venta.tipoPago.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${badge.className}`}>
                          {badge.label}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 text-right font-mono tabular-nums text-[13px] font-semibold pr-4">
                        {formatARS(Number(venta.total))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </div>

          {/* Paginación */}
          {(page > 0 || hayMas) && (
            <div className="flex items-center justify-between">
              {page > 0 ? (
                <Link
                  href={buildHref(page - 1)}
                  className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg border border-border bg-card text-[13px] font-medium hover:border-border/80 hover:bg-card/60 transition-all text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </Link>
              ) : (
                <div />
              )}
              <span className="text-xs text-muted-foreground">
                Página {page + 1}
              </span>
              {hayMas ? (
                <Link
                  href={buildHref(page + 1)}
                  className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg border border-border bg-card text-[13px] font-medium hover:border-border/80 hover:bg-card/60 transition-all text-muted-foreground hover:text-foreground"
                >
                  Siguiente
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <div />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
