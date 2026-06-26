'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { registrarPago } from '@/server/actions/cuenta-corriente';
import { formatARS } from '@/lib/utils';
import type { MetodoPago } from '@/server/db/schema';

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: 'efectivo',        label: 'Efectivo' },
  { value: 'transferencia',   label: 'Transferencia' },
  { value: 'cheque',          label: 'Cheque' },
  { value: 'mercado_pago',    label: 'Mercado Pago' },
  { value: 'tarjeta_debito',  label: 'Tarjeta débito' },
  { value: 'tarjeta_credito', label: 'Tarjeta crédito' },
  { value: 'otro',            label: 'Otro' },
];

type Props = {
  clienteId: string;
  saldoActual: number;
};

export function FormPago({ clienteId, saldoActual }: Props) {
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState<MetodoPago>('transferencia');
  const [referencia, setReferencia] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(monto);
    if (!monto || isNaN(n) || n <= 0) { toast.error('Ingresá un monto válido'); return; }

    startTransition(async () => {
      try {
        await registrarPago({ clienteId, monto, metodo, referencia: referencia || undefined });
        toast.success('Pago registrado correctamente');
        setMonto('');
        setReferencia('');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al registrar el pago');
      }
    });
  }

  const sinDeuda = saldoActual <= 0;

  return (
    <div className="space-y-2">
      {/* Estado de la deuda — deja claro por qué no se puede pagar de más */}
      <p className="text-[12px] text-muted-foreground">
        {sinDeuda ? (
          <>Este cliente <span className="font-medium text-foreground">no tiene deuda pendiente</span>. No se pueden registrar pagos sin deuda (no se permite saldo a favor).</>
        ) : (
          <>Deuda actual: <span className="font-semibold text-foreground tabular-nums">{formatARS(saldoActual)}</span>. El pago no puede superar la deuda.</>
        )}
      </p>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_2fr_auto] gap-3 items-end">

      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">Monto</label>
        <div className="relative">
          <Input
            type="number"
            min="0.01"
            step="0.01"
            max={sinDeuda ? undefined : saldoActual}
            placeholder={formatARS(Math.max(saldoActual, 0))}
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            disabled={sinDeuda}
            className="h-9 bg-background/40 border-border/60 text-sm font-mono tabular-nums pr-16"
          />
          {!sinDeuda && (
            <button
              type="button"
              onClick={() => setMonto(String(saldoActual))}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 rounded-md text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              Todo
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">Método</label>
        <Select value={metodo} onValueChange={(v) => setMetodo(v as MetodoPago)}>
          <SelectTrigger className="h-9 bg-background/40 border-border/60 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METODOS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">Referencia <span className="text-muted-foreground/40 normal-case">(opcional)</span></label>
        <Input
          placeholder="Nro. cheque, transferencia, etc."
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
          className="h-9 bg-background/40 border-border/60 text-sm"
        />
      </div>

      <Button type="submit" disabled={isPending || sinDeuda} className="h-9 px-4 glow-primary w-full sm:w-auto">
        {isPending ? 'Registrando...' : 'Registrar pago'}
      </Button>
    </form>
    </div>
  );
}
