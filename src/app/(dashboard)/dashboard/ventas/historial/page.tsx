import Link from 'next/link';
import { ChevronLeft, ChevronRight, ShoppingCart, Filter, X } from 'lucide-react';
import { listarVentas, type FiltrosHistorial } from '@/server/actions/ventas';
import { listarClientes } from '@/server/actions/clientes';
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

const ESTADOS = ['pendiente', 'parcial', 'pagada', 'anulada'] as const;

type Props = {
  searchParams: Promise<{
    canal?: string; page?: string;
    desde?: string; hasta?: string; cliente?: string; estado?: string;
  }>;
};

export default async function HistorialPage({ searchParams }: Props) {
  const sp = await searchParams;
  const canal: Canal = sp.canal === 'mayorista' ? 'mayorista' : 'minorista';
  const page = Math.max(0, parseInt(sp.page ?? '0', 10) || 0);

  const estado = (ESTADOS as readonly string[]).includes(sp.estado ?? '')
    ? (sp.estado as FiltrosHistorial['estado']) : undefined;
  const filtros: FiltrosHistorial = {
    desde: sp.desde || undefined,
    hasta: sp.hasta || undefined,
    clienteId: sp.cliente || undefined,
    estado,
  };
  const hayFiltros = Boolean(filtros.desde || filtros.hasta || filtros.clienteId || filtros.estado);

  const [{ rows, hayMas }, clientes] = await Promise.all([
    listarVentas(canal, page, filtros),
    listarClientes(),
  ]);

  // Preserva canal + filtros en la paginación.
  const buildHref = (p: number) => {
    const q = new URLSearchParams({ canal, page: String(p) });
    if (filtros.desde)     q.set('desde', filtros.desde);
    if (filtros.hasta)     q.set('hasta', filtros.hasta);
    if (filtros.clienteId) q.set('cliente', filtros.clienteId);
    if (filtros.estado)    q.set('estado', filtros.estado);
    return `/dashboard/ventas/historial?${q.toString()}`;
  };

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

      {/* Filtros — form GET nativo (sin JS): fecha desde/hasta, cliente, estado */}
      <form method="get" action="/dashboard/ventas/historial" className="panel p-3 sm:p-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="canal" value={canal} />
        <div className="space-y-1">
          <label className="field-label block">Desde</label>
          <input type="date" name="desde" defaultValue={filtros.desde ?? ''} className="h-9 bg-background border border-border rounded-md px-2.5 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="field-label block">Hasta</label>
          <input type="date" name="hasta" defaultValue={filtros.hasta ?? ''} className="h-9 bg-background border border-border rounded-md px-2.5 text-sm" />
        </div>
        <div className="space-y-1 min-w-[160px]">
          <label className="field-label block">Cliente</label>
          <select name="cliente" defaultValue={filtros.clienteId ?? ''} className="h-9 bg-background border border-border rounded-md px-2.5 text-sm w-full">
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.razonSocial}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="field-label block">Estado</label>
          <select name="estado" defaultValue={filtros.estado ?? ''} className="h-9 bg-background border border-border rounded-md px-2.5 text-sm capitalize">
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 transition-all glow-primary">
          <Filter className="h-3.5 w-3.5" /> Filtrar
        </button>
        {hayFiltros && (
          <Link href={`/dashboard/ventas/historial?canal=${canal}`} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" /> Limpiar
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        hayFiltros ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-sm font-medium mb-1">Sin resultados con esos filtros</p>
          <p className="text-xs text-muted-foreground mb-5">Probá ampliar el rango de fechas o cambiar el cliente/estado.</p>
          <Link href={`/dashboard/ventas/historial?canal=${canal}`} className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg border border-border text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" /> Limpiar filtros
          </Link>
        </div>
        ) : (
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
        )
      ) : (
        <>
          {/* Ticket de ventas — mismo lenguaje que "últimas ventas" del inicio */}
          <div className="ticket-paper">
            <div className="overflow-hidden rounded-[inherit]">
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
                    <TableRow key={venta.id} className="relative hover:bg-foreground/[0.02] border-b border-border/40 last:border-0 cursor-pointer group">
                      <TableCell className="pl-4 py-2.5">
                        <Link href={`/dashboard/ventas/historial/${venta.id}`} className="block font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors before:absolute before:inset-0 before:content-['']">
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
