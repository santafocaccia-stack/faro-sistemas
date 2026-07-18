import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Pencil, MessageCircle } from 'lucide-react';
import { obtenerPresupuesto } from '@/server/actions/presupuestos';
import { formatARS } from '@/lib/utils';
import { formatFechaAR } from '@/lib/fechas';
import { METODO_LABEL } from '@/lib/constants';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PresupuestoPDFButton, ReciboPDFButton } from '@/components/pdf-download-button';
import { PresupuestoAcciones } from '@/components/presupuesto-acciones';
import { GuardarPlantillaButton } from '@/components/plantilla-button';

const ESTADO_BADGE: Record<string, { label: string; cls: string }> = {
  borrador:  { label: 'Borrador',  cls: 'bg-muted text-muted-foreground border-border/40' },
  enviado:   { label: 'Enviado',   cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  aprobado:  { label: 'Aprobado',  cls: 'bg-success/10 text-success border-success/20' },
  rechazado: { label: 'Rechazado', cls: 'bg-destructive/10 text-destructive border-destructive/20' },
  vencido:   { label: 'Vencido',   cls: 'bg-warning/10 text-warning border-warning/20' },
  cobrado:   { label: 'Cobrado',   cls: 'bg-success/10 text-success border-success/20' },
};

type Props = { params: Promise<{ id: string }> };

export default async function DetallePresupuestoPage({ params }: Props) {
  const { id } = await params;

  const data = await obtenerPresupuesto(id);

  if (!data) notFound();

  const { pres, lineas, clienteDisplay, clienteTelefono, cobros } = data;
  const esBoleta = pres.tipo === 'boleta';
  const badge = ESTADO_BADGE[pres.estado] ?? ESTADO_BADGE.borrador!;

  const vencimiento = new Date(new Date(pres.fecha).getTime() + pres.validezDias * 86_400_000);
  const montoCobrado = Number(pres.montoCobrado);
  const saldo = Number(pres.total) - montoCobrado;

  // Link de WhatsApp: si el cliente tiene teléfono va directo a su chat
  const lineasTxt = lineas.map((l) => `• ${l.descripcion}: ${formatARS(Number(l.subtotal))}`).join('\n');
  const waTexto = encodeURIComponent(
    `¡Hola${clienteDisplay !== 'Sin cliente' ? ` ${clienteDisplay}` : ''}! Te paso el presupuesto #${String(pres.numero).padStart(5, '0')}:\n${lineasTxt}\nTotal: ${formatARS(Number(pres.total))}\nVálido hasta el ${formatFechaAR(vencimiento)}.`,
  );
  const waDigits = clienteTelefono ? clienteTelefono.replace(/\D/g, '').replace(/^0/, '') : null;
  const waHref = waDigits
    ? `https://wa.me/${waDigits.startsWith('54') ? waDigits : `549${waDigits}`}?text=${waTexto}`
    : `https://wa.me/?text=${waTexto}`;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-3xl mx-auto space-y-6 animate-fade-up">

      {/* Back + acciones */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Link
          href={esBoleta ? '/dashboard/boletas' : '/dashboard/presupuestos'}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          {esBoleta ? 'Volver a boletas' : 'Volver a presupuestos'}
        </Link>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {!esBoleta && (
            <PresupuestoAcciones
              id={pres.id}
              estadoActual={pres.estado}
              total={Number(pres.total)}
              montoCobrado={montoCobrado}
              numero={pres.numero}
              clienteId={pres.clienteId}
              clienteNombre={clienteDisplay !== 'Sin cliente' ? clienteDisplay : null}
            />
          )}
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md text-xs font-medium border border-success/30 bg-success/10 text-success hover:bg-success/15 transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </a>
          {!esBoleta && (
            <Link
              href={`/dashboard/presupuestos/${pres.id}/editar`}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md text-xs font-medium border border-border/60 bg-background hover:border-border hover:bg-muted transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Link>
          )}
          {!esBoleta && !pres.esPlantilla && <GuardarPlantillaButton presupuestoId={pres.id} />}
          <PresupuestoPDFButton presupuestoId={pres.id} />
          {!esBoleta && pres.estado === 'cobrado' && <ReciboPDFButton presupuestoId={pres.id} />}
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-xs text-muted-foreground">#{String(pres.numero).padStart(5, '0')}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wide ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight leading-tight">
            {esBoleta ? 'Boleta' : 'Presupuesto'} {formatARS(Number(pres.total))}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {formatFechaAR(pres.fecha, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 mb-1">Cliente</p>
          <p className="text-[13px] font-medium">{clienteDisplay}</p>
        </div>
        {esBoleta ? (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 mb-1">Método de pago</p>
            <p className="text-[13px] font-medium">{METODO_LABEL[pres.metodoCobro ?? ''] ?? '—'}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 mb-1">Válido hasta</p>
            <p className="text-[13px] font-medium">
              {formatFechaAR(vencimiento)}
              <span className="text-[11px] text-muted-foreground ml-1">({pres.validezDias} días)</span>
            </p>
          </div>
        )}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 mb-1">Negocio</p>
          <p className="text-[13px] font-medium">Ver en configuración</p>
        </div>
      </div>

      {/* Líneas */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/60">
              <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 pl-4">Descripción</TableHead>
              <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 text-right">Cant.</TableHead>
              <TableHead className="hidden sm:table-cell h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 text-right">P. unit.</TableHead>
              <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 text-right pr-4">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineas.map((l) => (
              <TableRow key={l.id} className="hover:bg-foreground/[0.02] border-b border-border/40 last:border-0">
                <TableCell className="pl-4 py-2.5 text-[13px] font-medium">{l.descripcion}</TableCell>
                <TableCell className="text-right py-2.5 font-mono tabular-nums text-[13px] text-muted-foreground">{Number(l.cantidad)}</TableCell>
                <TableCell className="hidden sm:table-cell text-right py-2.5 font-mono tabular-nums text-[13px] text-muted-foreground">{formatARS(Number(l.precioUnitario))}</TableCell>
                <TableCell className="text-right pr-4 py-2.5 font-mono tabular-nums text-[13px] font-semibold">{formatARS(Number(l.subtotal))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Totales */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col sm:items-end gap-2 text-sm">
          <div className="flex justify-between w-full sm:max-w-xs text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-mono tabular-nums">{formatARS(Number(pres.subtotal))}</span>
          </div>
          {Number(pres.descuento) > 0 && (
            <div className="flex justify-between w-full sm:max-w-xs text-success">
              <span>Descuento</span>
              <span className="font-mono tabular-nums">− {formatARS(Number(pres.descuento))}</span>
            </div>
          )}
          <div className="h-px bg-border/60 w-full sm:max-w-xs my-1" />
          <div className="flex justify-between w-full sm:max-w-xs text-base font-semibold">
            <span>Total</span>
            <span className="font-mono tabular-nums">{formatARS(Number(pres.total))}</span>
          </div>
          {montoCobrado > 0 && saldo > 0.01 && (
            <>
              <div className="flex justify-between w-full sm:max-w-xs text-success text-sm">
                <span>Señado</span>
                <span className="font-mono tabular-nums">− {formatARS(montoCobrado)}</span>
              </div>
              <div className="flex justify-between w-full sm:max-w-xs text-sm font-semibold text-warning">
                <span>Saldo pendiente</span>
                <span className="font-mono tabular-nums">{formatARS(saldo)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pagos registrados */}
      {cobros.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 mb-2">Pagos registrados</p>
          <div className="divide-y divide-border/40">
            {cobros.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted-foreground">
                  {formatFechaAR(c.cobradoAt)}
                  <span className="ml-2 text-xs">{METODO_LABEL[c.metodo] ?? c.metodo}</span>
                </span>
                <span className="font-mono tabular-nums font-semibold">{formatARS(Number(c.monto))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notas */}
      {pres.notas && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 mb-2">Observaciones</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{pres.notas}</p>
        </div>
      )}
    </div>
  );
}
