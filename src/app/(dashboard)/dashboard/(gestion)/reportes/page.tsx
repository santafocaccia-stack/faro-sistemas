import Link from 'next/link';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { obtenerReporte, obtenerSerieReporte, type Granularidad } from '@/server/actions/reportes';
import { dashboardPrestamos } from '@/server/actions/prestamos';
import { resumenServicios } from '@/server/actions/presupuestos';
import { requireSession } from '@/server/auth/session';
import { planTiene } from '@/lib/planes';
import { formatARS } from '@/lib/utils';
import { LineChart } from '@/components/ui/line-chart';
import { TopProductos } from '@/components/top-productos';
import { PageHeader } from '@/components/ui/page-header';
import { METODO_LABEL } from '@/lib/constants';

const GRANS: { value: Granularidad; label: string }[] = [
  { value: 'dia', label: 'Días' },
  { value: 'semana', label: 'Semanas' },
  { value: 'mes', label: 'Meses' },
  { value: 'trimestre', label: 'Trimestres' },
  { value: 'anio', label: 'Años' },
];

type Props = { searchParams: Promise<{ gran?: string }> };

export default async function ReportesPage({ searchParams }: Props) {
  const { gran: granParam } = await searchParams;
  const gran: Granularidad = (GRANS.map((g) => g.value) as string[]).includes(granParam ?? '')
    ? (granParam as Granularidad)
    : 'dia';

  const session = await requireSession();
  const plan = session.plan;
  const esPos = planTiene(plan, 'pos');
  const esPrestamos = planTiene(plan, 'prestamos');
  const esServicios = planTiene(plan, 'presupuestos') && !esPos;

  const serie = await obtenerSerieReporte(gran);
  const rep = esPos ? await obtenerReporte('mes') : null;
  const cartera = esPrestamos ? await dashboardPrestamos() : null;
  const rs = esServicios ? await resumenServicios() : null;

  const delta = serie.totalPrevio > 0
    ? ((serie.totalActual - serie.totalPrevio) / serie.totalPrevio) * 100
    : serie.totalActual > 0 ? 100 : 0;
  const subio = delta >= 0;

  // KPIs por plan
  const kpis: { label: string; valor: string; sub?: string }[] = esPos && rep
    ? [
        { label: serie.metricaLabel, valor: formatARS(serie.totalActual), sub: 'período actual' },
        { label: 'Ticket promedio', valor: formatARS(rep.resumen.ticketPromedio), sub: 'últimos 30 días' },
        { label: 'Minorista', valor: formatARS(rep.minorista.total), sub: `${rep.minorista.cantidad} ventas` },
        { label: 'Mayorista', valor: formatARS(rep.mayorista.total), sub: `${rep.mayorista.cantidad} ventas` },
      ]
    : esPrestamos && cartera
    ? [
        { label: 'Cobrado', valor: formatARS(serie.totalActual), sub: 'período actual' },
        { label: 'Total prestado', valor: formatARS(cartera.totalPrestado), sub: `${cartera.activos} activos` },
        { label: 'A cobrar', valor: formatARS(cartera.aCobrar), sub: 'saldo pendiente' },
        { label: 'En mora', valor: String(cartera.enMora), sub: 'préstamos' },
      ]
    : rs
    ? [
        { label: 'Cobrado', valor: formatARS(serie.totalActual), sub: 'período actual' },
        { label: 'Cobrado este mes', valor: formatARS(rs.cobradoMes), sub: `${rs.cobradoMesCant} cobros` },
        { label: 'Por cobrar', valor: formatARS(rs.porCobrar), sub: `${rs.porCobrarCant} aprobados` },
        { label: 'Presupuestos abiertos', valor: String(rs.abiertos), sub: 'borradores / enviados' },
      ]
    : [];

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-6xl mx-auto space-y-6 animate-fade-up">
      <PageHeader icon={BarChart3} title="Reportes" subtitle="Evolución del negocio y comparativa con el período anterior" />

      {/* Selector de granularidad */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit overflow-x-auto no-scrollbar">
        {GRANS.map((gr) => (
          <Link
            key={gr.value}
            href={`/dashboard/reportes?gran=${gr.value}`}
            className={`px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all whitespace-nowrap ${
              gran === gr.value ? 'bg-card text-foreground shadow-[0_1px_2px_oklch(0_0_0_/_0.3)]' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {gr.label}
          </Link>
        ))}
      </div>

      {/* Gráfico de líneas con comparativa */}
      <div className="panel p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">{serie.metricaLabel} por período</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Línea llena: actual · punteada: período anterior</p>
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${subio ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
            {subio ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {subio ? '+' : ''}{delta.toFixed(0)}%
          </span>
        </div>
        <LineChart serie={serie.serie} comparacion={serie.comparacion} />
      </div>

      {/* KPIs por plan */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((k, i) => (
            <div key={k.label} className={`panel p-4 ${i === 0 ? 'stat-accent' : ''}`}>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">{k.label}</p>
              <p className="text-xl font-semibold font-mono tabular-nums mt-1">{k.valor}</p>
              {k.sub && <p className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Paneles secundarios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Top productos — solo planes con productos */}
        {esPos && rep && (
          <div className="panel overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60">
              <h3 className="text-sm font-semibold tracking-tight">Top productos</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Más vendidos (últimos 30 días)</p>
            </div>
            <TopProductos items={rep.topProductos} />
          </div>
        )}

        {/* Métodos de pago / cobro */}
        {esPos && rep && rep.porMetodo.length > 0 && (
          <div className="panel overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60">
              <h3 className="text-sm font-semibold tracking-tight">Métodos de pago</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Cobros recibidos (últimos 30 días)</p>
            </div>
            <div className="divide-y divide-border/40">
              {rep.porMetodo.map((m) => {
                const totalGlobal = rep.porMetodo.reduce((a, x) => a + x.total, 0);
                const pct = totalGlobal > 0 ? (m.total / totalGlobal) * 100 : 0;
                return (
                  <div key={m.metodo} className="px-4 py-2.5 list-row">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[13px] font-medium">{METODO_LABEL[m.metodo] ?? m.metodo}</p>
                      <p className="text-[13px] font-mono tabular-nums font-semibold">{formatARS(m.total)}<span className="text-[11px] text-muted-foreground ml-1.5">{pct.toFixed(0)}%</span></p>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary/70 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
