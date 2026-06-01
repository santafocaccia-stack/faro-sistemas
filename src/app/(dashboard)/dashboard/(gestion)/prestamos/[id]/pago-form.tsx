'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { registrarPagoPrestamo } from '@/server/actions/prestamos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function PagoPrestamoForm({ prestamoId, sugerido }: { prestamoId: string; sugerido: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [monto, setMonto] = useState(sugerido);
  const [metodo, setMetodo] = useState('efectivo');
  const [error, setError] = useState('');

  const submit = () =>
    start(async () => {
      setError('');
      const r = await registrarPagoPrestamo({ prestamoId, monto, metodo: metodo as never });
      if (r.ok) { setMonto(''); router.refresh(); }
      else setError(r.error);
    });

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[140px] space-y-1.5">
        <label className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Registrar pago ($)</label>
        <Input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} className="h-9 bg-background border-border" placeholder="Monto recibido" />
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Método</label>
        <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className="h-9 bg-background border border-border rounded-md px-3 text-sm">
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
          <option value="mercado_pago">Mercado Pago</option>
          <option value="cheque">Cheque</option>
        </select>
      </div>
      <Button className="glow-primary h-9" disabled={pending || !monto} onClick={submit}>
        {pending ? 'Registrando…' : 'Registrar pago'}
      </Button>
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}
