import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { obtenerPrestamo } from '@/server/actions/prestamos';
import { formatARS } from '@/lib/utils';
import { PagoPrestamoForm } from './pago-form';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

const ESTADO_CUOTA: Record<string, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'text-muted-foreground' },
  parcial: { label: 'Parcial', cls: 'text-warning' },
  pagada: { label: 'Pagada', cls: 'text-success' },
  vencida: { label: 'Vencida', cls: 'text-destructive' },
};

export default async function PrestamoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await obtenerPrestamo(id);
  if (!data) notFound();
  const { prestamo, cliente, cuotas, pagos } = data;

  const saldo = cuotas.reduce((a, c) => a + (Number(c.montoCuota) - Number(c.montoPagado)), 0);
  const moraTotal = cuotas.reduce((a, c) => a + c.moraViva, 0);
  const fmtFecha = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-4xl mx-auto space-y-6 animate-fade-up">
      <div>
        <Link href="/dashboard/prestamos" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mb-2">
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />Volver a préstamos
        </Link>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight">{cliente?.razonSocial ?? 'Deudor'}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {formatARS(prestamo.capital)} · {prestamo.cantidadCuotas} cuotas {prestamo.frecuencia} · {prestamo.tasaNominalAnual}% anual · {prestamo.sistema}
            </p>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Saldo pendiente</p>
          <p className="text-lg font-semibold font-mono tabular-nums">{formatARS(saldo.toFixed(2))}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Mora acumulada</p>
          <p className={`text-lg font-semibold font-mono tabular-nums ${moraTotal > 0 ? 'text-destructive' : ''}`}>{formatARS(moraTotal.toFixed(2))}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Estado</p>
          <p className="text-lg font-semibold capitalize">{prestamo.estado.replace('_', ' ')}</p>
        </div>
      </div>

      {/* Registrar pago */}
      {prestamo.estado !== 'cancelado' && <PagoPrestamoForm prestamoId={prestamo.id} sugerido={saldo > 0 ? Math.min(saldo + moraTotal, Number(cuotas.find((c) => c.estado !== 'pagada')?.montoCuota ?? 0) + moraTotal).toFixed(2) : ''} />}

      {/* Cronograma */}
      <div className="panel overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60"><h2 className="text-[13px] font-semibold">Cronograma de cuotas</h2></div>

        {/* Mobile: tarjetas */}
        <ul className="md:hidden divide-y divide-border/50">
          {cuotas.map((c) => {
            const badge = ESTADO_CUOTA[c.vencida && c.estado !== 'pagada' && c.estado !== 'parcial' ? 'vencida' : c.estado] ?? ESTADO_CUOTA.pendiente!;
            return (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 font-mono text-xs text-muted-foreground">{c.numero}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">{formatARS(c.montoCuota)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    vence {fmtFecha(c.vencimiento)}
                    {c.moraViva > 0 && <span className="text-destructive"> · mora {formatARS(c.moraViva.toFixed(2))}</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[11px] font-semibold ${badge.cls}`}>{badge.label}</span>
                  {Number(c.montoPagado) > 0 && <p className="text-[10px] text-muted-foreground font-mono">pagó {formatARS(c.montoPagado)}</p>}
                </div>
              </li>
            );
          })}
        </ul>

        {/* Desktop: tabla */}
        <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/60">
              <TableHead className="h-9 text-[10px] uppercase tracking-wide text-muted-foreground/70 pl-4">#</TableHead>
              <TableHead className="h-9 text-[10px] uppercase tracking-wide text-muted-foreground/70">Vence</TableHead>
              <TableHead className="h-9 text-[10px] uppercase tracking-wide text-muted-foreground/70 text-right">Cuota</TableHead>
              <TableHead className="h-9 text-[10px] uppercase tracking-wide text-muted-foreground/70 text-right">Pagado</TableHead>
              <TableHead className="h-9 text-[10px] uppercase tracking-wide text-muted-foreground/70 text-right">Mora</TableHead>
              <TableHead className="h-9 text-[10px] uppercase tracking-wide text-muted-foreground/70 pr-4">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cuotas.map((c) => {
              const badge = ESTADO_CUOTA[c.vencida && c.estado !== 'pagada' && c.estado !== 'parcial' ? 'vencida' : c.estado] ?? ESTADO_CUOTA.pendiente!;
              return (
                <TableRow key={c.id} className="border-b border-border/40 last:border-0">
                  <TableCell className="pl-4 py-2.5 font-mono text-xs text-muted-foreground">{c.numero}</TableCell>
                  <TableCell className="py-2.5 text-[12px]">{fmtFecha(c.vencimiento)}</TableCell>
                  <TableCell className="py-2.5 text-right font-mono tabular-nums text-[12px]">{formatARS(c.montoCuota)}</TableCell>
                  <TableCell className="py-2.5 text-right font-mono tabular-nums text-[12px] text-muted-foreground">{formatARS(c.montoPagado)}</TableCell>
                  <TableCell className="py-2.5 text-right font-mono tabular-nums text-[12px] text-destructive">{c.moraViva > 0 ? formatARS(c.moraViva.toFixed(2)) : '—'}</TableCell>
                  <TableCell className={`pr-4 py-2.5 text-[11px] font-semibold ${badge.cls}`}>{badge.label}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Pagos */}
      {pagos.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60"><h2 className="text-[13px] font-semibold">Pagos registrados</h2></div>
          <div className="divide-y divide-border/40">
            {pagos.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-[12px]">{new Date(p.fecha).toLocaleDateString('es-AR')} · {p.metodo.replace('_', ' ')}</p>
                  <p className="text-[11px] text-muted-foreground">capital {formatARS(p.aCapital)} · interés {formatARS(p.aInteres)} · mora {formatARS(p.aMora)}</p>
                </div>
                <p className="font-mono tabular-nums text-[13px] font-semibold">{formatARS(p.montoTotal)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
