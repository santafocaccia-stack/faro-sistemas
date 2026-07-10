import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { obtenerVenta } from '@/server/actions/ventas';
import { obtenerTenant } from '@/server/actions/config';
import { formatARS } from '@/lib/utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { BoletaImprimible, PrintButton } from '@/components/boleta-imprimible';
import { RemitoPDFButton } from '@/components/pdf-download-button';
import { VentaAnularButton } from '@/components/venta-anular-button';

const estadoBadge: Record<string, { label: string; className: string }> = {
  pagada:    { label: 'Pagada',    className: 'bg-success/15 text-success border-success/20' },
  pendiente: { label: 'Pendiente', className: 'bg-warning/15 text-warning border-warning/20' },
  parcial:   { label: 'Parcial',   className: 'bg-muted text-muted-foreground border-border' },
  anulada:   { label: 'Anulada',   className: 'bg-destructive/15 text-destructive border-destructive/20' },
};

type Props = { params: Promise<{ id: string }> };

export default async function DetalleVentaPage({ params }: Props) {
  const { id } = await params;

  const [data, tenant] = await Promise.all([
    obtenerVenta(id),
    obtenerTenant(),
  ]);

  if (!data) notFound();

  const { venta, clienteNombre, lineas, metodoPago } = data;
  const badge = estadoBadge[venta.estado] ?? { label: venta.estado, className: 'bg-muted text-muted-foreground' };

  return (
    <>
      {/* ── Vista en pantalla ─────────────────────────── */}
      <div className="screen-only px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-3xl mx-auto animate-fade-up">

        {/* Back link */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <Link
            href={`/dashboard/ventas/historial?canal=${venta.canal}`}
            className="no-print inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Volver al historial
          </Link>
          <div className="flex items-center gap-2">
            <VentaAnularButton ventaId={venta.id} estado={venta.estado} />
            {venta.canal === 'mayorista' && (
              <RemitoPDFButton ventaId={venta.id} />
            )}
            <PrintButton canal={venta.canal} />
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-xs text-muted-foreground">#{venta.numero}</span>
              <span className="text-xs text-muted-foreground/40">·</span>
              <span className="text-xs text-muted-foreground capitalize">{venta.canal}</span>
            </div>
            <h1 className="text-[28px] font-semibold tracking-tight leading-tight">
              Venta {formatARS(Number(venta.total))}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 capitalize">
              {new Date(venta.fecha).toLocaleDateString('es-AR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${badge.className}`}>
            {badge.label}
          </span>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 mb-1">Cliente</p>
            <p className="text-[13px] font-medium">{clienteNombre ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 mb-1">Tipo de pago</p>
            <p className="text-[13px] font-medium capitalize">{venta.tipoPago.replace('_', ' ')}</p>
          </div>
          {venta.notas && (
            <div className="rounded-xl border border-border bg-card p-4 sm:col-span-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 mb-1">Notas</p>
              <p className="text-sm">{venta.notas}</p>
            </div>
          )}
        </div>

        {/* Líneas */}
        <div className="rounded-xl border border-border bg-card overflow-hidden mb-8">
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
              <span className="font-mono tabular-nums">{formatARS(Number(venta.subtotal))}</span>
            </div>
            {Number(venta.descuento) > 0 && (
              <div className="flex justify-between w-full sm:max-w-xs text-success">
                <span>Descuento</span>
                <span className="font-mono tabular-nums">− {formatARS(Number(venta.descuento))}</span>
              </div>
            )}
            <div className="h-px bg-border/60 w-full sm:max-w-xs my-1" />
            <div className="flex justify-between w-full sm:max-w-xs text-base font-semibold">
              <span>Total</span>
              <span className="font-mono tabular-nums">{formatARS(Number(venta.total))}</span>
            </div>
            {venta.tipoPago === 'cuenta_corriente' && (
              <div className="flex justify-between w-full sm:max-w-xs text-xs text-muted-foreground mt-1">
                <span>Pagado</span>
                <span className="font-mono tabular-nums">{formatARS(Number(venta.montoPagado))}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Boleta para imprimir (invisible en pantalla) ── */}
      <BoletaImprimible
        numero={venta.numero}
        fecha={venta.fecha}
        canal={venta.canal}
        estado={venta.estado}
        clienteNombre={clienteNombre ?? null}
        tipoPago={venta.tipoPago}
        metodoPago={metodoPago}
        subtotalVenta={venta.subtotal}
        descuento={venta.descuento}
        total={venta.total}
        montoPagado={venta.montoPagado}
        notas={venta.notas}
        lineas={lineas}
        negocioNombre={tenant?.nombre ?? 'Mi negocio'}
        negocioCuit={tenant?.cuit}
        negocioDireccion={tenant?.direccion}
        negocioTelefono={tenant?.telefono}
      />
    </>
  );
}
