import Link from 'next/link';
import { Plus, Landmark, TrendingUp, AlertTriangle, Wallet, ChevronRight } from 'lucide-react';
import { dashboardPrestamos, listarPrestamos } from '@/server/actions/prestamos';
import { formatARS } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

const ESTADO: Record<string, { label: string; cls: string }> = {
  vigente: { label: 'Vigente', cls: 'bg-success/10 text-success border-success/20' },
  en_mora: { label: 'En mora', cls: 'bg-destructive/10 text-destructive border-destructive/20' },
  cancelado: { label: 'Cancelado', cls: 'bg-muted text-muted-foreground border-border/40' },
  refinanciado: { label: 'Refinanciado', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  incobrable: { label: 'Incobrable', cls: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export default async function PrestamosPage() {
  const [kpis, prestamos] = await Promise.all([dashboardPrestamos(), listarPrestamos()]);

  const cards = [
    { label: 'Total prestado', valor: kpis.totalPrestado, icon: Landmark, sub: `${kpis.activos} activos` },
    { label: 'Por cobrar', valor: kpis.aCobrar, icon: TrendingUp, sub: 'capital + interés' },
    { label: 'Cobrado este mes', valor: kpis.cobradoMes, icon: Wallet, sub: '' },
    { label: 'En mora', valor: String(kpis.enMora), icon: AlertTriangle, sub: 'préstamos', raw: true },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-5xl mx-auto space-y-6 animate-fade-up">
      <PageHeader
        icon={Landmark}
        title="Préstamos"
        subtitle="Tu cartera de créditos y cobranzas"
        action={
          <Button asChild className="glow-primary h-9">
            <Link href="/dashboard/prestamos/nuevo">
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Nuevo préstamo</span>
            </Link>
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <div key={c.label} className={`panel p-4 ${i === 0 ? 'stat-accent' : ''} ${c.raw && Number(c.valor) > 0 ? 'stat-accent !border-l-destructive' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70">{c.label}</span>
              <c.icon className={`h-4 w-4 ${c.raw && Number(c.valor) > 0 ? 'text-destructive' : 'text-muted-foreground/50'}`} />
            </div>
            <p className={`text-xl font-semibold font-mono tabular-nums ${c.raw && Number(c.valor) > 0 ? 'text-destructive' : ''}`}>
              {c.raw ? c.valor : formatARS(c.valor)}
            </p>
            {c.sub && <p className="text-[11px] text-muted-foreground mt-0.5">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Lista */}
      {prestamos.length === 0 ? (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-20 text-center">
          <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center mb-4">
            <Landmark className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Sin préstamos</p>
          <p className="text-xs text-muted-foreground mt-1 mb-5">Registrá tu primer préstamo a un deudor</p>
          <Button asChild size="sm" className="glow-primary">
            <Link href="/dashboard/prestamos/nuevo"><Plus className="h-3.5 w-3.5 mr-1.5" />Nuevo préstamo</Link>
          </Button>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          {/* Mobile: tarjetas */}
          <ul className="md:hidden divide-y divide-border/50 stagger">
            {prestamos.map((p) => {
              const badge = ESTADO[p.estado] ?? ESTADO.vigente!;
              return (
                <li key={p.id}>
                  <Link href={`/dashboard/prestamos/${p.id}`} className="list-row flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium truncate">{p.clienteNombre}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatARS(p.capital)} · {p.cantidadCuotas} cuotas
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="font-mono tabular-nums text-[13px] font-semibold">{formatARS(p.saldoPendiente)}</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border uppercase tracking-wide ${badge.cls}`}>{badge.label}</span>
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
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 pl-4">Deudor</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Capital</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Cuotas</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Estado</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 text-right pr-4">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prestamos.map((p) => {
                const badge = ESTADO[p.estado] ?? ESTADO.vigente!;
                return (
                  <TableRow key={p.id} className="relative hover:bg-white/[0.02] border-b border-border/40 last:border-0 cursor-pointer">
                    <TableCell className="pl-4 py-3">
                      <Link href={`/dashboard/prestamos/${p.id}`} className="block text-[13px] font-medium hover:text-primary transition-colors before:absolute before:inset-0 before:content-['']">
                        {p.clienteNombre}
                      </Link>
                    </TableCell>
                    <TableCell className="py-3 font-mono tabular-nums text-[13px]">{formatARS(p.capital)}</TableCell>
                    <TableCell className="py-3 text-[13px] text-muted-foreground">{p.cantidadCuotas}</TableCell>
                    <TableCell className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wide ${badge.cls}`}>{badge.label}</span>
                    </TableCell>
                    <TableCell className="pr-4 py-3 text-right font-mono tabular-nums text-[13px] font-semibold">{formatARS(p.saldoPendiente)}</TableCell>
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
