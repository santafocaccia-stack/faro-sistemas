'use client';

import Link from 'next/link';
import {
  ShoppingCart, BookOpen, Package, BarChart3, Users,
  ArrowRight, TrendingUp, AlertTriangle, Zap, Clock,
} from 'lucide-react';
import { cn, formatARS } from '@/lib/utils';
import { StaggerList, StaggerItem, FadeUp } from '@/components/motion-primitives';
import { InicioHero } from '@/components/ui/inicio-hero';

/* ─────────────────────────────────────────────────────────────
   Tipos
───────────────────────────────────────────────────────────── */
type UltimaVenta = {
  id: string;
  numero: number;
  canal: string;
  fecha: Date;
  total: unknown;
  estado: string;
  clienteNombre: string | null;
};

type Props = {
  saludo: string;
  nombre: string;
  fechaLabel: string;
  totalHoy: number;
  cantHoy: number;
  mensajeMotivacional: string;
  totalSemana: number;
  cantSemana: number;
  cobrosTotal: number;
  cobrosCant: number;
  stockBajo: number;
  totalMinorista: number;
  totalMayorista: number;
  ultimasVentas: UltimaVenta[];
};

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
const estadoConfig: Record<string, { dot: string; label: string }> = {
  pagada:    { dot: 'bg-success',     label: 'Pagada' },
  pendiente: { dot: 'bg-warning',     label: 'Pendiente' },
  parcial:   { dot: 'bg-muted-foreground', label: 'Parcial' },
  anulada:   { dot: 'bg-destructive', label: 'Anulada' },
};

function horaRelativa(fecha: Date): string {
  const diff = Date.now() - new Date(fecha).getTime();
  const min  = Math.floor(diff / 60_000);
  const hrs  = Math.floor(diff / 3_600_000);
  const dias = Math.floor(diff / 86_400_000);
  if (min < 1)   return 'ahora';
  if (min < 60)  return `hace ${min} min`;
  if (hrs < 24)  return `hace ${hrs}h`;
  if (dias === 1) return 'ayer';
  return `hace ${dias} días`;
}

/* ─────────────────────────────────────────────────────────────
   Componente principal
───────────────────────────────────────────────────────────── */
export function DashboardClient({
  saludo, nombre, fechaLabel,
  totalHoy, cantHoy, mensajeMotivacional,
  totalSemana, cantSemana,
  cobrosTotal, cobrosCant,
  stockBajo,
  totalMinorista, totalMayorista,
  ultimasVentas,
}: Props) {

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-3xl mx-auto space-y-7 pb-24 md:pb-10">

      {/* ── Hero saludo + CTA Nueva venta ─────────────────── */}
      <FadeUp index={0}>
        <InicioHero
          saludo={saludo}
          nombre={nombre}
          fechaLabel={fechaLabel}
          nota={cantHoy > 0 ? (
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-warning shrink-0" />
              {mensajeMotivacional}
            </span>
          ) : saludo === 'Buenos días'
            ? 'Arrancá el día — registrá tu primera venta.'
            : 'Todavía no hay ventas hoy — registrá la primera.'}
        >
          <Link
            href="/dashboard/ventas"
            className={cn(
              'group flex items-center justify-center gap-3',
              'w-full h-12 rounded-xl',
              'bg-primary text-primary-foreground',
              'text-base sm:text-[15px] font-bold tracking-tight',
              'transition-all duration-150 press-scale glow-primary',
              'hover:brightness-105',
            )}
          >
            <ShoppingCart className="h-5 w-5" strokeWidth={2.25} />
            Nueva venta
            <ArrowRight className="h-4 w-4 opacity-60 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </InicioHero>
      </FadeUp>

      {/* ── KPI Cards ─────────────────────────────────────── */}
      <StaggerList className="kpi-band grid grid-cols-3 divide-x divide-border/60 p-1.5">

        {/* Hoy */}
        <StaggerItem>
          <div className={cn(
            'rounded-lg p-3.5 sm:p-4 space-y-1 h-full',
            totalHoy > 0 && 'bg-primary/5',
          )}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
              Hoy
            </p>
            <p className={cn(
              'font-mono font-bold tabular-nums leading-tight',
              'text-[18px] sm:text-[22px]',
              totalHoy > 0 ? 'text-primary' : 'text-foreground',
            )}>
              {formatARS(totalHoy)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {cantHoy === 0 ? 'Sin ventas' : `${cantHoy} ${cantHoy === 1 ? 'venta' : 'ventas'}`}
            </p>
            {/* Desglose minorista/mayorista */}
            {cantHoy > 0 && (totalMinorista > 0 && totalMayorista > 0) && (
              <div className="pt-1.5 mt-1.5 border-t border-border/50 space-y-0.5">
                {totalMinorista > 0 && (
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Mostrador</span>
                    <span className="font-mono tabular-nums">{formatARS(totalMinorista)}</span>
                  </div>
                )}
                {totalMayorista > 0 && (
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Mayorista</span>
                    <span className="font-mono tabular-nums">{formatARS(totalMayorista)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </StaggerItem>

        {/* Semana */}
        <StaggerItem>
          <div className="rounded-lg p-3.5 sm:p-4 space-y-1 h-full">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
              Semana
            </p>
            <p className="font-mono font-bold tabular-nums leading-tight text-[18px] sm:text-[22px]">
              {formatARS(totalSemana)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {cantSemana === 0 ? 'Sin ventas' : `${cantSemana} ${cantSemana === 1 ? 'venta' : 'ventas'}`}
            </p>
          </div>
        </StaggerItem>

        {/* Cobros pendientes */}
        <StaggerItem>
          <Link href="/dashboard/cc" className="block group">
            <div className={cn(
              'rounded-lg p-3.5 sm:p-4 space-y-1 h-full transition-colors',
              cobrosTotal > 0
                ? 'bg-destructive/5 hover:bg-destructive/10'
                : 'hover:bg-foreground/[0.03]',
            )}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                Cobros
              </p>
              <p className={cn(
                'font-mono font-bold tabular-nums leading-tight text-[18px] sm:text-[22px]',
                cobrosTotal > 0 ? 'text-destructive' : '',
              )}>
                {formatARS(cobrosTotal)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {cobrosCant === 0
                  ? 'Al día ✓'
                  : `${cobrosCant} ${cobrosCant === 1 ? 'cliente' : 'clientes'}`}
              </p>
            </div>
          </Link>
        </StaggerItem>

      </StaggerList>

      {/* ── Acciones rápidas ──────────────────────────────── */}
      <FadeUp index={3}>
        <div className="space-y-2.5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 px-0.5">
            Acciones rápidas
          </h2>

          <div className="grid grid-cols-2 gap-2.5">

            {/* Cobros pendientes */}
            <Link href="/dashboard/cc" className="group">
              <div className={cn(
                'rounded-xl border bg-card p-4 flex items-start gap-3',
                'transition-all hover:border-border/80 hover:bg-card/80 press-scale',
                cobrosTotal > 0 ? 'border-warning/20' : 'border-border',
              )}>
                <div className={cn(
                  'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                  cobrosTotal > 0 ? 'bg-warning/15' : 'bg-muted',
                )}>
                  <BookOpen className={cn(
                    'h-4.5 w-4.5',
                    cobrosTotal > 0 ? 'text-warning' : 'text-muted-foreground',
                  )} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-tight">Cobros</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                    {cobrosCant > 0
                      ? `${cobrosCant} pendiente${cobrosCant > 1 ? 's' : ''}`
                      : 'Ver cuenta cte.'}
                  </p>
                </div>
              </div>
            </Link>

            {/* Stock */}
            <Link href="/dashboard/productos" className="group">
              <div className={cn(
                'rounded-xl border bg-card p-4 flex items-start gap-3',
                'transition-all hover:border-border/80 hover:bg-card/80 press-scale',
                stockBajo > 0 ? 'border-warning/20' : 'border-border',
              )}>
                <div className={cn(
                  'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                  stockBajo > 0 ? 'bg-warning/15' : 'bg-muted',
                )}>
                  {stockBajo > 0
                    ? <AlertTriangle className="h-4.5 w-4.5 text-warning" strokeWidth={1.75} />
                    : <Package className="h-4.5 w-4.5 text-muted-foreground" strokeWidth={1.75} />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-tight">Productos</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                    {stockBajo > 0
                      ? `${stockBajo} con stock bajo`
                      : 'Ver catálogo'}
                  </p>
                </div>
              </div>
            </Link>

            {/* Clientes */}
            <Link href="/dashboard/clientes" className="group">
              <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3 transition-all hover:border-border/80 hover:bg-card/80 press-scale">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Users className="h-4.5 w-4.5 text-muted-foreground" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold leading-tight">Clientes</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Ver todos</p>
                </div>
              </div>
            </Link>

            {/* Reportes */}
            <Link href="/dashboard/reportes" className="group">
              <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3 transition-all hover:border-border/80 hover:bg-card/80 press-scale">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <BarChart3 className="h-4.5 w-4.5 text-muted-foreground" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold leading-tight">Reportes</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Ventas y stats</p>
                </div>
              </div>
            </Link>

          </div>
        </div>
      </FadeUp>

      {/* ── Últimas ventas ────────────────────────────────── */}
      <FadeUp index={4}>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
              Últimas ventas
            </h2>
            <Link
              href="/dashboard/ventas/historial"
              className="text-[12px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group"
            >
              Ver todo
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {ultimasVentas.length === 0 ? (
            <EmptyVentas />
          ) : (
            <div className="ticket-paper">
              {ultimasVentas.map((v, i) => {
                const cfg = estadoConfig[v.estado] ?? { dot: 'bg-muted-foreground', label: v.estado };
                const hora = horaRelativa(v.fecha);
                const esMinorista = v.canal === 'minorista';
                return (
                  <Link
                    key={v.id}
                    href={`/dashboard/ventas/historial/${v.id}`}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3.5',
                      'hover:bg-foreground/[0.025] transition-colors',
                      i < ultimasVentas.length - 1 && 'border-b border-border/40',
                    )}
                  >
                    {/* Indicador canal */}
                    <div className={cn(
                      'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                      esMinorista ? 'bg-primary/10' : 'bg-muted',
                    )}>
                      <ShoppingCart
                        className={cn('h-3.5 w-3.5', esMinorista ? 'text-primary' : 'text-muted-foreground')}
                        strokeWidth={1.75}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">
                        {v.clienteNombre ?? 'Sin cliente'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', cfg.dot)} />
                        <span className="text-[11px] text-muted-foreground">{cfg.label}</span>
                        <span className="text-muted-foreground/40 text-[11px]">·</span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {hora}
                        </span>
                      </div>
                    </div>

                    {/* Monto + número */}
                    <div className="text-right shrink-0">
                      <p className="font-mono tabular-nums text-[14px] font-semibold">
                        {formatARS(Number(v.total))}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">#{v.numero}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </FadeUp>

    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Empty state
───────────────────────────────────────────────────────────── */
function EmptyVentas() {
  return (
    <div className="rounded-xl border border-border bg-card p-10 text-center space-y-4">
      {/* Ilustración con emoji + glow */}
      <div className="relative mx-auto w-16 h-16">
        <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" />
        <div className="relative h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
          <TrendingUp className="h-6 w-6 text-primary" strokeWidth={1.5} />
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold">Todavía no hay ventas</p>
        <p className="text-xs text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
          Registrá tu primera venta y acá vas a ver todo el historial del día.
        </p>
      </div>

      <Link
        href="/dashboard/ventas"
        className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 transition-all glow-primary"
      >
        <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2.25} />
        Registrar primera venta
      </Link>
    </div>
  );
}
