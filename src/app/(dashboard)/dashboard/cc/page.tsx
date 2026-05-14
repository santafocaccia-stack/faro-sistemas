import Link from 'next/link';
import { BookOpen, ArrowRight } from 'lucide-react';
import { listarClientes } from '@/server/actions/clientes';
import { formatARS } from '@/lib/utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export default async function CuentaCorrientePage() {
  const clientes = await listarClientes();
  const conCC = clientes.filter((c) => c.habilitaCuentaCorriente);
  const totalDeuda = conCC.reduce((a, c) => a + Number(c.saldoActual), 0);
  const conDeuda = conCC.filter((c) => Number(c.saldoActual) > 0).length;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-5xl mx-auto space-y-8 animate-fade-up">

      {/* Header */}
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Cuenta Corriente</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {conCC.length} {conCC.length === 1 ? 'cliente habilitado' : 'clientes habilitados'}
        </p>
      </div>

      {/* Resumen total */}
      {conCC.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-medium text-muted-foreground mb-3">Pendiente total</p>
            <p className={`text-[24px] font-semibold tracking-tight tabular-nums font-mono leading-none ${totalDeuda > 0 ? 'text-destructive' : ''}`}>
              {formatARS(totalDeuda)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-medium text-muted-foreground mb-3">Clientes con deuda</p>
            <p className="text-[24px] font-semibold tracking-tight font-mono leading-none">{conDeuda}</p>
            <p className="text-xs text-muted-foreground mt-2">de {conCC.length} habilitados</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-medium text-muted-foreground mb-3">Deuda promedio</p>
            <p className="text-[24px] font-semibold tracking-tight tabular-nums font-mono leading-none">
              {formatARS(conDeuda > 0 ? totalDeuda / conDeuda : 0)}
            </p>
          </div>
        </div>
      )}

      {conCC.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-14 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/8 border border-primary/15 mx-auto mb-4 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium mb-1">Sin cuentas corrientes habilitadas</p>
          <p className="text-xs text-muted-foreground mb-5 max-w-sm mx-auto">
            Activá la cuenta corriente desde el detalle de un cliente para empezar a registrar movimientos.
          </p>
          <Link
            href="/dashboard/clientes"
            className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg border border-border bg-card text-[13px] font-medium hover:bg-card/60 transition-all"
          >
            Ir a clientes
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/60">
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 pl-4">Cliente</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Tipo</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 text-right">Saldo</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 text-right pr-4">Límite</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conCC.map((c) => {
                const saldo = Number(c.saldoActual);
                const limite = Number(c.limiteCredito ?? 0);
                const excedido = limite > 0 && saldo > limite;
                return (
                  <TableRow key={c.id} className="hover:bg-white/[0.02] border-b border-border/40 last:border-0 cursor-pointer">
                    <TableCell className="pl-4 py-2.5">
                      <Link href={`/dashboard/cc/${c.id}`} className="block">
                        <p className="text-[13px] font-medium">{c.razonSocial}</p>
                        {c.nombreFantasia && (
                          <p className="text-[11px] text-muted-foreground">{c.nombreFantasia}</p>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-muted-foreground capitalize">{c.tipo}</TableCell>
                    <TableCell className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {excedido && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border bg-destructive/15 text-destructive border-destructive/20">
                            Excedido
                          </span>
                        )}
                        <span className={`font-mono tabular-nums text-[13px] ${saldo > 0 ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                          {formatARS(saldo)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="pr-4 py-2.5 text-right font-mono tabular-nums text-[13px] text-muted-foreground">
                      {limite > 0 ? formatARS(limite) : <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
