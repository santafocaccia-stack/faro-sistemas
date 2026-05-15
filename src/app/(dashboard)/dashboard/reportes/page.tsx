import Link from 'next/link';
import { TrendingUp, Activity, Receipt } from 'lucide-react';
import { obtenerReporte, type Periodo } from '@/server/actions/reportes';
import { formatARS } from '@/lib/utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ExportCsvButton } from '@/components/export-csv-button';
import { METODO_LABEL } from '@/lib/constants';

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: 'hoy',        label: 'Hoy' },
  { value: 'semana',     label: 'Semana' },
  { value: 'mes',        label: '30 días' },
  { value: 'tres_meses', label: '3 meses' },
];

type Props = { searchParams: Promise<{ periodo?: string }> };

export default async function ReportesPage({ searchParams }: Props) {
  const { periodo: periodoParam } = await searchParams;
  const periodo: Periodo = (PERIODOS.map((p) => p.value) as string[]).includes(periodoParam ?? '')
    ? (periodoParam as Periodo)
    : 'mes';

  const data = await obtenerReporte(periodo);

  // Agrupar días por fecha
  const diasMap = new Map<string, { minorista: number; mayorista: number }>();
  for (const row of data.porDia) {
    const entry = diasMap.get(row.dia) ?? { minorista: 0, mayorista: 0 };
    if (row.canal === 'minorista') entry.minorista = Number(row.total);
    else entry.mayorista = Number(row.total);
    diasMap.set(row.dia, entry);
  }
  const dias = [...diasMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  // Props para CSV export
  const csvProps = {
    periodo,
    resumen:      data.resumen,
    minorista:    data.minorista,
    mayorista:    data.mayorista,
    porMetodo:    data.porMetodo,
    topProductos: data.topProductos,
    dias,
  };

  // Calcular máximo del período para barras
  const maxDia = Math.max(...dias.map(([, v]) => v.minorista + v.mayorista), 1);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-6xl mx-auto space-y-8 animate-fade-up">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Reportes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Análisis del negocio por período
          </p>
        </div>

        {/* Controles: filtro + export */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro de período pill */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {PERIODOS.map((p) => (
              <Link
                key={p.value}
                href={`/dashboard/reportes?periodo=${p.value}`}
                className={`px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 ${
                  periodo === p.value
                    ? 'bg-card text-foreground shadow-[0_1px_2px_oklch(0_0_0_/_0.3)]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p.label}
              </Link>
            ))}
          </div>

          {/* Botón export CSV */}
          <ExportCsvButton {...csvProps} />
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total ventas" icon={TrendingUp} accent="primary">
          <p className="text-[24px] font-semibold tracking-tight tabular-nums font-mono leading-none">
            {formatARS(data.resumen.total)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">{data.resumen.cantidad} operaciones</p>
        </KpiCard>

        <KpiCard label="Ticket promedio" icon={Receipt} accent="muted">
          <p className="text-[24px] font-semibold tracking-tight tabular-nums font-mono leading-none">
            {formatARS(data.resumen.ticketPromedio)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">por venta</p>
        </KpiCard>

        <KpiCard label="Minorista" icon={Activity} accent="muted">
          <p className="text-[24px] font-semibold tracking-tight tabular-nums font-mono leading-none">
            {formatARS(data.minorista.total)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">{data.minorista.cantidad} ventas</p>
        </KpiCard>

        <KpiCard label="Mayorista" icon={Activity} accent="muted">
          <p className="text-[24px] font-semibold tracking-tight tabular-nums font-mono leading-none">
            {formatARS(data.mayorista.total)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">{data.mayorista.cantidad} ventas</p>
        </KpiCard>
      </div>

      {/* Grid: Top productos + Métodos de pago */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* Top productos */}
        <Section title="Top productos" subtitle="Por monto vendido en el período">
          {data.topProductos.length === 0 ? (
            <EmptyMini message="Sin datos en el período" />
          ) : (
            <div className="divide-y divide-border/40">
              {data.topProductos.map((p, i) => {
                const max = Math.max(...data.topProductos.map((x) => x.totalMonto), 1);
                const pct = (p.totalMonto / max) * 100;
                return (
                  <div key={p.productoId ?? i} className="px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium truncate">{p.nombre ?? 'Sin nombre'}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-[13px] font-mono tabular-nums font-semibold">{formatARS(p.totalMonto)}</p>
                        <p className="text-[11px] text-muted-foreground font-mono tabular-nums">
                          {p.totalCantidad % 1 === 0 ? p.totalCantidad : p.totalCantidad.toFixed(3)}
                        </p>
                      </div>
                    </div>
                    {/* Barra */}
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/70 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Métodos de pago */}
        <Section title="Métodos de pago" subtitle="Cobros recibidos">
          {data.porMetodo.length === 0 ? (
            <EmptyMini message="Sin cobros en el período" />
          ) : (
            <div className="divide-y divide-border/40">
              {data.porMetodo.map((m) => {
                const totalGlobal = data.porMetodo.reduce((a, x) => a + x.total, 0);
                const pct = totalGlobal > 0 ? (m.total / totalGlobal) * 100 : 0;
                return (
                  <div key={m.metodo} className="px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[13px] font-medium">{METODO_LABEL[m.metodo] ?? m.metodo}</p>
                      <div className="text-right">
                        <p className="text-[13px] font-mono tabular-nums font-semibold">{formatARS(m.total)}</p>
                        <p className="text-[11px] text-muted-foreground font-mono tabular-nums">
                          {pct.toFixed(0)}% · {m.cantidad}
                        </p>
                      </div>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/70 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      {/* Desglose por día */}
      <Section title="Ventas por día" subtitle="Comparativa minorista vs mayorista">
        {dias.length === 0 ? (
          <EmptyMini message="Sin ventas en el período" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/60">
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 pl-4 w-32">Fecha</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Distribución</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 text-right">Minorista</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 text-right">Mayorista</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 text-right pr-4">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dias.map(([dia, vals]) => {
                const total = vals.minorista + vals.mayorista;
                const [y = '', m = '', d = ''] = dia.split('-');
                const fechaLabel = `${d}/${m}/${y.slice(2)}`;
                const minPct = total > 0 ? (vals.minorista / maxDia) * 100 : 0;
                const mayPct = total > 0 ? (vals.mayorista / maxDia) * 100 : 0;
                return (
                  <TableRow key={dia} className="hover:bg-white/[0.02] border-b border-border/40 last:border-0">
                    <TableCell className="pl-4 py-2.5 font-mono tabular-nums text-xs text-muted-foreground">{fechaLabel}</TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex h-1.5 w-full max-w-[200px] rounded-full overflow-hidden bg-muted">
                        <div className="bg-primary/80" style={{ width: `${minPct}%` }} />
                        <div className="bg-chart-4/80" style={{ width: `${mayPct}%` }} />
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-mono tabular-nums text-[13px] text-muted-foreground">
                      {vals.minorista > 0 ? formatARS(vals.minorista) : <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-mono tabular-nums text-[13px] text-muted-foreground">
                      {vals.mayorista > 0 ? formatARS(vals.mayorista) : <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell className="pr-4 py-2.5 text-right font-mono tabular-nums text-[13px] font-semibold">
                      {formatARS(total)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}

/* ─────── Helpers ─────── */

function KpiCard({
  label, icon: Icon, accent = 'muted', children,
}: {
  label: string;
  icon: React.ElementType;
  accent?: 'primary' | 'muted';
  children: React.ReactNode;
}) {
  const accentBg = accent === 'primary' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground';
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${accentBg}`}>
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        </div>
      </div>
      {children}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border/60">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function EmptyMini({ message }: { message: string }) {
  return <p className="text-xs text-muted-foreground text-center py-12">{message}</p>;
}
