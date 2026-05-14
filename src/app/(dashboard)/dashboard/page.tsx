import Link from 'next/link';
import { ShoppingCart, BookOpen, AlertTriangle, TrendingUp, ArrowRight, ArrowUpRight, Package } from 'lucide-react';
import { obtenerKpisDashboard } from '@/server/actions/dashboard';
import { formatARS } from '@/lib/utils';
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
  const ticketPromedio = cantHoy > 0 ? totalHoy / cantHoy : 0;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <FadeUp index={0}>
        <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Inicio</h1>
        <p className="text-sm text-muted-foreground mt-1 capitalize">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </FadeUp>

      {/* KPI cards — grilla 2×2 compacta */}
      <StaggerList className="grid grid-cols-2 gap-3">

        {/* Ventas hoy */}
        <StaggerItem>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground/70">Hoy</p>
              <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-3 w-3 text-primary" strokeWidth={2} />
              </div>
            </div>
            <p className="text-[22px] font-bold tracking-tight tabular-nums font-mono leading-none">
              {formatARS(totalHoy)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {cantHoy === 0 ? 'Sin ventas aún' : `${cantHoy} ${cantHoy === 1 ? 'venta' : 'ventas'}`}
            </p>
            {cantHoy > 0 && (
              <div className="mt-3 pt-2.5 border-t border-border/50 space-y-1">
                {kpis.ventasHoy.minorista.cantidad > 0 && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Minorista</span>
                    <span className="tabular-nums font-mono">{formatARS(kpis.ventasHoy.minorista.total)}</span>
                  </div>
                )}
                {kpis.ventasHoy.mayorista.cantidad > 0 && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Mayorista</span>
                    <span className="tabular-nums font-mono">{formatARS(kpis.ventasHoy.mayorista.total)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </StaggerItem>

        {/* Ventas esta semana */}
        <StaggerItem>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground/70">Semana</p>
              <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-3 w-3 text-primary" strokeWidth={2} />
              </div>
            </div>
            <p className="text-[22px] font-bold tracking-tight tabular-nums font-mono leading-none">
              {formatARS(kpis.ventasSemana.total)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {kpis.ventasSemana.cantidad === 0
                ? 'Sin ventas esta semana'
                : `${kpis.ventasSemana.cantidad} ${kpis.ventasSemana.cantidad === 1 ? 'venta' : 'ventas'}`}
            </p>
            {cantHoy > 0 && (
              <div className="mt-3 pt-2.5 border-t border-border/50">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Ticket promedio</span>
                  <span className="tabular-nums font-mono">{formatARS(ticketPromedio)}</span>
                </div>
              </div>
            )}
          </div>
        </StaggerItem>

        {/* Pendiente de cobro */}
        <StaggerItem>
          <Link href="/dashboard/cc" className="group block">
            <div className="rounded-xl border border-border bg-card p-4 transition-all duration-200 group-hover:border-border/80 group-hover:bg-card/60">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground/70">Cobros</p>
                <div className={`h-6 w-6 rounded-md flex items-center justify-center ${
                  kpis.pendienteCC.total > 0 ? 'bg-destructive/10' : 'bg-muted'
                }`}>
                  <BookOpen className={`h-3 w-3 ${kpis.pendienteCC.total > 0 ? 'text-destructive' : 'text-muted-foreground'}`} strokeWidth={2} />
                </div>
              </div>
              <p className={`text-[22px] font-bold tracking-tight tabular-nums font-mono leading-none ${
                kpis.pendienteCC.total > 0 ? 'text-destructive' : ''
              }`}>
                {formatARS(kpis.pendienteCC.total)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {kpis.pendienteCC.cantidad === 0
                  ? 'Todo al día'
                  : `${kpis.pendienteCC.cantidad} ${kpis.pendienteCC.cantidad === 1 ? 'cliente' : 'clientes'}`}
              </p>
              <div className="mt-3 pt-2.5 border-t border-border/50">
                <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-0.5">
                  Ver cuenta corriente
                  <ArrowUpRight className="h-2.5 w-2.5" />
                </span>
              </div>
            </div>
          </Link>
        </StaggerItem>

        {/* Stock bajo */}
        <StaggerItem>
          <Link href="/dashboard/productos" className="group block">
            <div className="rounded-xl border border-border bg-card p-4 transition-all duration-200 group-hover:border-border/80 group-hover:bg-card/60">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground/70">Stock</p>
                <div className={`h-6 w-6 rounded-md flex items-center justify-center ${
                  kpis.stockBajo > 0 ? 'bg-warning/10' : 'bg-muted'
                }`}>
                  {kpis.stockBajo > 0
                    ? <AlertTriangle className="h-3 w-3 text-warning" strokeWidth={2} />
                    : <Package className="h-3 w-3 text-muted-foreground" strokeWidth={2} />
                  }
                </div>
              </div>
              <p className={`text-[22px] font-bold tracking-tight font-mono leading-none ${
                kpis.stockBajo > 0 ? 'text-warning' : ''
              }`}>
                {kpis.stockBajo}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {kpis.stockBajo === 0
                  ? 'Todo en niveles normales'
                  : `${kpis.stockBajo === 1 ? 'producto bajo' : 'productos bajos'} el mínimo`}
              </p>
              <div className="mt-3 pt-2.5 border-t border-border/50">
                <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-0.5">
                  Ver productos
                  <ArrowUpRight className="h-2.5 w-2.5" />
                </span>
              </div>
            </div>
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold tracking-tight">Últimas ventas</h2>
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
          <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/40">
            {kpis.ultimasVentas.map((v) => {
              const badge = estadoBadge[v.estado] ?? { label: v.estado, className: 'bg-muted text-muted-foreground' };
              return (
                <Link
                  key={v.id}
                  href={`/dashboard/ventas/historial/${v.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors group"
                >
                  {/* Número + canal */}
                  <div className="w-14 shrink-0">
                    <p className="font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">#{v.numero}</p>
                    <p className="text-[10px] text-muted-foreground/60 capitalize mt-0.5">{v.canal}</p>
                  </div>

                  {/* Cliente */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{v.clienteNombre ?? 'Sin cliente'}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono tabular-nums">
                      {new Date(v.fecha).toLocaleDateString('es-AR', {
                        day: '2-digit', month: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {/* Estado + total */}
                  <div className="shrink-0 text-right">
                    <p className="font-mono tabular-nums text-[13px] font-semibold">{formatARS(Number(v.total))}</p>
                    <span className={`inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </FadeUp>
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
