import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { listarClientes } from '@/server/actions/clientes';
import { listarMovimientosCliente } from '@/server/actions/cuenta-corriente';
import { formatARS } from '@/lib/utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { FormPago } from './form-pago';
import { RevertirMovimientoBtn } from './revertir-movimiento-btn';

type Props = { params: Promise<{ clienteId: string }> };

const tipoLabel: Record<string, { label: string; className: string }> = {
  venta:        { label: 'Venta',           className: 'bg-muted text-muted-foreground border-border' },
  pago:         { label: 'Pago',            className: 'bg-success/15 text-success border-success/20' },
  nota_credito: { label: 'Nota crédito',    className: 'bg-success/15 text-success border-success/20' },
  nota_debito:  { label: 'Nota débito',     className: 'bg-warning/15 text-warning border-warning/20' },
  ajuste_debe:  { label: 'Ajuste debe',     className: 'bg-muted text-muted-foreground border-border' },
  ajuste_haber: { label: 'Ajuste haber',    className: 'bg-muted text-muted-foreground border-border' },
  saldo_inicial:{ label: 'Saldo inicial',   className: 'bg-muted text-muted-foreground border-border' },
};

export default async function DetalleCCPage({ params }: Props) {
  const { clienteId } = await params;
  const clientes = await listarClientes();
  const cliente = clientes.find((c) => c.id === clienteId);
  if (!cliente) notFound();

  const movimientos = await listarMovimientosCliente(clienteId);
  const saldo = Number(cliente.saldoActual);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-5xl mx-auto space-y-8 animate-fade-up">

      {/* Back link */}
      <Link
        href="/dashboard/cc"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Cuenta corriente
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight leading-tight">{cliente.razonSocial}</h1>
          {cliente.nombreFantasia && (
            <p className="text-sm text-muted-foreground mt-1">{cliente.nombreFantasia}</p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card px-5 py-3 text-right">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 mb-1">Saldo deudor</p>
          <p className={`text-[28px] font-semibold tracking-tight tabular-nums font-mono leading-none ${saldo > 0 ? 'text-destructive' : 'text-success'}`}>
            {formatARS(saldo)}
          </p>
        </div>
      </div>

      {/* Registrar pago */}
      {saldo > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold tracking-tight">Registrar pago</h2>
            <p className="text-xs text-muted-foreground mt-0.5">El movimiento se asienta automáticamente y descuenta del saldo</p>
          </div>
          <FormPago clienteId={clienteId} saldoActual={saldo} />
        </div>
      )}

      {/* Movimientos */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold tracking-tight">Movimientos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {movimientos.length} {movimientos.length === 1 ? 'asiento' : 'asientos'} registrados
          </p>
        </div>

        {movimientos.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <p className="text-xs text-muted-foreground">Sin movimientos registrados aún</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/60">
                  <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 pl-4 w-20">Fecha</TableHead>
                  <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Descripción</TableHead>
                  <TableHead className="hidden sm:table-cell h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 text-right">Debe</TableHead>
                  <TableHead className="hidden sm:table-cell h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 text-right">Haber</TableHead>
                  <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 text-right pr-4">Saldo</TableHead>
                  <TableHead className="h-10 w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.map((m) => {
                  const tipo = tipoLabel[m.tipo] ?? { label: m.tipo, className: 'bg-muted text-muted-foreground' };
                  return (
                    <TableRow key={m.id} className="hover:bg-foreground/[0.02] border-b border-border/40 last:border-0">
                      <TableCell className="pl-4 py-2.5 font-mono tabular-nums text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(m.fecha).toLocaleDateString('es-AR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${tipo.className} shrink-0`}>
                            {tipo.label}
                          </span>
                          <span className="text-[13px] font-medium">{m.descripcion}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell py-2.5 text-right font-mono tabular-nums text-[13px]">
                        {Number(m.debe) > 0
                          ? <span className="text-foreground">{formatARS(Number(m.debe))}</span>
                          : <span className="text-muted-foreground/40">—</span>}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell py-2.5 text-right font-mono tabular-nums text-[13px]">
                        {Number(m.haber) > 0
                          ? <span className="text-success">{formatARS(Number(m.haber))}</span>
                          : <span className="text-muted-foreground/40">—</span>}
                      </TableCell>
                      <TableCell className="pr-4 py-2.5 text-right font-mono tabular-nums text-[13px] font-semibold">
                        {formatARS(Number(m.saldoPosterior))}
                      </TableCell>
                      <TableCell className="pr-2 py-2.5 text-right">
                        {/* Mostrar botón solo en tipos revertibles y si no es ya una reversión */}
                        {(['pago', 'ajuste_haber', 'nota_credito'] as const).includes(m.tipo as any)
                          && !m.descripcion.startsWith('REV-') && (
                          <RevertirMovimientoBtn
                            movimientoId={m.id}
                            descripcion={m.descripcion}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
