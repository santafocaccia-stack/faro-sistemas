import Link from 'next/link';
import { Landmark, Plus, ArrowRight, AlertTriangle } from 'lucide-react';
import { dashboardPrestamos, listarPrestamos } from '@/server/actions/prestamos';
import { formatARS } from '@/lib/utils';

const ESTADO: Record<string, { label: string; cls: string }> = {
  vigente:      { label: 'Vigente',      cls: 'text-success' },
  en_mora:      { label: 'En mora',      cls: 'text-destructive' },
  cancelado:    { label: 'Cancelado',    cls: 'text-muted-foreground' },
  refinanciado: { label: 'Refinanciado', cls: 'text-warning' },
  incobrable:   { label: 'Incobrable',   cls: 'text-destructive' },
};

export async function PrestamistaInicio({
  saludo, nombre, fechaLabel,
}: { saludo: string; nombre: string; fechaLabel: string }) {
  const [kpis, prestamos] = await Promise.all([dashboardPrestamos(), listarPrestamos()]);
  const recientes = prestamos.slice(0, 6);

  const cards = [
    { label: 'Total prestado', value: formatARS(kpis.totalPrestado), sub: `${kpis.activos} activos` },
    { label: 'A cobrar', value: formatARS(kpis.aCobrar), sub: 'saldo pendiente' },
    { label: 'En mora', value: String(kpis.enMora), sub: 'préstamos', alerta: kpis.enMora > 0 },
    { label: 'Cobrado este mes', value: formatARS(kpis.cobradoMes), sub: '' },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-10 max-w-5xl mx-auto space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight leading-tight">
            {saludo}, {nombre}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{fechaLabel}</p>
        </div>
        <Link
          href="/dashboard/prestamos/nuevo"
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold glow-primary hover:brightness-105 transition-all self-start"
        >
          <Plus className="h-4 w-4" />
          Nuevo préstamo
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className={`panel p-4 ${c.label === 'Total prestado' ? 'stat-accent' : ''} ${c.alerta ? 'stat-accent !border-l-destructive' : ''}`}>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">{c.label}</p>
            <p className={`text-xl font-semibold font-mono tabular-nums mt-1 ${c.alerta ? 'text-destructive' : ''}`}>
              {c.value}
            </p>
            {c.sub && <p className="text-[11px] text-muted-foreground mt-0.5">{c.sub}</p>}
          </div>
        ))}
      </div>

      {kpis.enMora > 0 && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Tenés {kpis.enMora} préstamo{kpis.enMora > 1 ? 's' : ''} en mora. Revisá la cartera para gestionar la cobranza.
        </div>
      )}

      {/* Préstamos recientes */}
      <div className="panel overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold">Préstamos recientes</h2>
          <Link href="/dashboard/prestamos" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            Ver cartera <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <Landmark className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Todavía no cargaste préstamos</p>
            <Link href="/dashboard/prestamos/nuevo" className="text-xs text-primary hover:underline mt-1">
              Crear el primero
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {recientes.map((p) => {
              const badge = ESTADO[p.estado] ?? ESTADO.vigente!;
              return (
                <Link
                  key={p.id}
                  href={`/dashboard/prestamos/${p.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate">{p.clienteNombre}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatARS(p.capital)} · {p.cantidadCuotas} cuotas · <span className={badge.cls}>{badge.label}</span>
                    </p>
                  </div>
                  <p className="font-mono tabular-nums text-[13px] font-semibold shrink-0 ml-3">
                    {formatARS(p.saldoPendiente)}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
