import Link from 'next/link';
import { ShoppingCart, BookOpen, AlertTriangle, TrendingUp, ArrowRight, ArrowUpRight } from 'lucide-react';
import { obtenerKpisDashboard } from '@/server/actions/dashboard';
import { formatARS } from '@/lib/utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { FadeUp, StaggerList, StaggerItem } from '@/components/motion-primitives';

const estadoBadge: Record<string, { label: string; className: string }> = {
  pagada:    { label: 'Pagada',    className: 'bg-success/15 text-success border-success/20' },
  pendiente: { label: 'Pendiente', className: 'bg-warning/15 text-warning border-warning/20' },
  parcial:   { label: 'Parcial',   className: 'bg-muted text-muted-foreground border-border' },
  anulada:   { label: 'Anulada',   className: 'bg-destructive/15 text-destructive border-destructive/20' },
};

export default async function DashboardPage() {
  const kpis = await obtenerKpisDashboard();
  const totalHoy = kpis.ventasHoy.minorista.total + kpis.ventasHoy.mayorista.total;
  const cantHoy = kpis.ventasHoy.minorista.cantidad + kpis.ventasHoy.mayorista.cantidad;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-6xl mx-auto space-y-10">

      {/* Header */}
      <FadeUp index={0}>
        <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Inicio</h1>
        <p className="text-sm text-muted-foreground mt-1 capitalize">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </FadeUp>

      {/* KPI cards — stagger entrance */}
      <StaggerList className="grid grid-cols-1 sm:grid-cols-3 gap-3">

        {/* Ventas hoy */}
        <StaggerItem>
          <KpiCard label="Ventas hoy" icon={TrendingUp} accent="primary">
            <p className="text-[28px] font-semibold tracking-tight tabular-nums font-mono leading-none">
              {formatARS(totalHoy)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {cantHoy === 0 ? 'Sin ventas aún' : `${cantHoy} ${cantHoy === 1 ? 'venta' : 'ventas'}`}
            </p>
            {cantHoy > 0 && (
              <div className="pt-3 mt-3 border-t border-border/60 space-y-1.5">
                {kpis.ventasHoy.minorista.cantidad > 0 && (
                  <DesgloseRow label={`Minorista · ${kpis.ventasHoy.minorista.cantidad}`} value={kpis.ventasHoy.minorista.total} />
                )}
                {kpis.ventasHoy.mayorista.cantidad > 0 && (
                  <DesgloseRow label={`Mayorista · ${kpis.ventasHoy.mayorista.cantidad}`} value={kpis.ventasHoy.mayorista.total} />
                )}
              </div>
            )}
          </KpiCard>
        </StaggerItem>

        {/* Pendiente de cobro */}
        <StaggerItem>
          <Link href="/dashboard/cc" className="group block h-full">
            <KpiCard
              label="Pendiente de cobro"
              icon={BookOpen}
              accent={kpis.pendienteCC.total > 0 ? 'destructive' : 'muted'}
              interactive
            >
              <p className={`text-[28px] font-semibold tracking-tight tabular-nums font-mono leading-none ${
                kpis.pendienteCC.total > 0 ? 'text-destructive' : ''
              }`}>
                {formatARS(kpis.pendienteCC.total)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {kpis.pendienteCC.cantidad === 0
                  ? 'Todo al día'
                  : `${kpis.pendienteCC.cantidad} ${kpis.pendienteCC.cantidad === 1 ? 'cliente' : 'clientes'} con deuda`}
              </p>
              <FooterLink>Ver cuenta corriente</FooterLink>
            </KpiCard>
          </Link>
        </StaggerItem>

        {/* Stock bajo */}
        <StaggerItem>
          <Link href="/dashboard/productos" className="group block h-full">
            <KpiCard
              label="Stock bajo"
              icon={AlertTriangle}
              accent={kpis.stockBajo > 0 ? 'warning' : 'muted'}
              interactive
            >
              <p className={`text-[28px] font-semibold tracking-tight font-mono leading-none ${
                kpis.stockBajo > 0 ? 'text-warning' : ''
              }`}>
                {kpis.stockBajo}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {kpis.stockBajo === 0
                  ? 'Stock en niveles normales'
                  : `${kpis.stockBajo === 1 ? 'producto' : 'productos'} bajo el mínimo`}
              </p>
              <FooterLink>Ver productos</FooterLink>
            </KpiCard>
          </Link>
        </StaggerItem>
      </StaggerList>

      {/* Accesos rápidos */}
      <FadeUp index={2} className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/ventas"
          className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 transition-all glow-primary"
        >
          <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2.25} />
          Nueva venta
        </Link>
        <Link
          href="/dashboard/cc"
          className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg border border-border bg-card text-[13px] font-medium hover:border-border/80 hover:bg-card/60 transition-all text-muted-foreground hover:text-foreground"
        >
          <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
          Cobros
        </Link>
        <Link
          href="/dashboard/reportes"
          className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg border border-border bg-card text-[13px] font-medium hover:border-border/80 hover:bg-card/60 transition-all text-muted-foreground hover:text-foreground"
        >
          <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.75} />
          Reportes
        </Link>
      </FadeUp>

      {/* Últimas ventas */}
      <FadeUp index={3}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Últimas ventas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Las {kpis.ultimasVentas.length} más recientes</p>
          </div>
          <Link
            href="/dashboard/ventas/historial"
            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group"
          >
            Ver todo
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {kpis.ultimasVentas.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/60">
                  <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 w-20 pl-4">Núm.</TableHead>
                  <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Fecha</TableHead>
                  <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Canal</TableHead>
                  <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Cliente</TableHead>
                  <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Estado</TableHead>
                  <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 text-right pr-4">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpis.ultimasVentas.map((v) => {
                  const badge = estadoBadge[v.estado] ?? { label: v.estado, className: 'bg-muted text-muted-foreground' };
                  return (
                    <TableRow key={v.id} className="hover:bg-white/[0.02] border-b border-border/40 last:border-0">
                      <TableCell className="pl-4 py-2.5">
                        <Link
                          href={`/dashboard/ventas/historial/${v.id}`}
                          className="block font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          #{v.numero}
                        </Link>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-muted-foreground font-mono tabular-nums">
                        {new Date(v.fecha).toLocaleDateString('es-AR', {
                          day: '2-digit', month: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span className="capitalize text-xs text-muted-foreground">{v.canal}</span>
                      </TableCell>
                      <TableCell className="py-2.5 text-[13px] font-medium">{v.clienteNombre ?? '—'}</TableCell>
                      <TableCell className="py-2.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${badge.className}`}>
                          {badge.label}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 text-right font-mono tabular-nums text-[13px] font-semibold pr-4">
                        {formatARS(Number(v.total))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </FadeUp>
    </div>
  );
}

/* ─────────────────── Helpers ─────────────────── */

function KpiCard({
  label, icon: Icon, accent = 'muted', interactive = false, children,
}: {
  label: string;
  icon: React.ElementType;
  accent?: 'primary' | 'destructive' | 'warning' | 'muted';
  interactive?: boolean;
  children: React.ReactNode;
}) {
  const accentBg = {
    primary: 'bg-primary/10 text-primary',
    destructive: 'bg-destructive/10 text-destructive',
    warning: 'bg-warning/10 text-warning',
    muted: 'bg-muted text-muted-foreground',
  }[accent];

  return (
    <div
      className={`rounded-xl border border-border bg-card p-5 h-full transition-all duration-200 ${
        interactive ? 'group-hover:border-border/80 group-hover:bg-card/60' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${accentBg}`}>
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        </div>
      </div>
      {children}
    </div>
  );
}

function DesgloseRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums font-mono font-medium text-foreground">{formatARS(value)}</span>
    </div>
  );
}

function FooterLink({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-3 mt-3 border-t border-border/60">
      <span className="text-[11px] text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
        {children}
        <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-border bg-card p-12 text-center">
      <div className="h-14 w-14 rounded-2xl bg-primary/8 border border-primary/15 mx-auto mb-4 flex items-center justify-center">
        <ShoppingCart className="h-5 w-5 text-primary" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-medium mb-1">Empezá tu primer día de operación</p>
      <p className="text-xs text-muted-foreground mb-5 max-w-sm mx-auto">
        Las ventas que registres acá quedan automáticamente reflejadas en stock, cuenta corriente y reportes.
      </p>
      <Link
        href="/dashboard/ventas"
        className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 transition-all glow-primary"
      >
        <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2.25} />
        Ir al punto de venta
      </Link>
    </div>
  );
}
