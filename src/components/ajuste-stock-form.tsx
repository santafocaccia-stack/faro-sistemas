'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Boxes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ajustarStock } from '@/server/actions/productos';
import type { TipoUnidad } from '@/server/db/schema';

type Props = {
  productoId: string;
  stockActual: number;
  tipoUnidad: TipoUnidad;
};

export function AjusteStockForm({ productoId, stockActual, tipoUnidad }: Props) {
  const [tipo, setTipo] = useState<'entrada' | 'salida'>('entrada');
  const [cantidad, setCantidad] = useState('');
  const [isPending, startTransition] = useTransition();

  const esKg = tipoUnidad === 'por_kg';
  const step = esKg ? '0.001' : '1';
  const placeholder = esKg ? '0.000' : '0';

  const preview = cantidad
    ? tipo === 'entrada'
      ? stockActual + Number(cantidad)
      : stockActual - Number(cantidad)
    : stockActual;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cantidad || Number(cantidad) <= 0) { toast.error('Ingresá una cantidad válida'); return; }

    startTransition(async () => {
      try {
        await ajustarStock({ productoId, tipo, cantidad });
        toast.success(`Stock ${tipo === 'entrada' ? 'ingresado' : 'descontado'} correctamente`);
        setCantidad('');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al ajustar stock');
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Boxes className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Ajustar stock</h2>
          <p className="text-[11px] text-muted-foreground">Compras de mercadería, mermas o correcciones manuales</p>
        </div>
      </div>

      {/* Selector entrada / salida tipo pill */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg mb-4">
        <button
          type="button"
          onClick={() => setTipo('entrada')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 ${
            tipo === 'entrada'
              ? 'bg-card text-success shadow-[0_1px_2px_oklch(0_0_0_/_0.3)]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
          Entrada
        </button>
        <button
          type="button"
          onClick={() => setTipo('salida')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 ${
            tipo === 'salida'
              ? 'bg-card text-destructive shadow-[0_1px_2px_oklch(0_0_0_/_0.3)]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />
          Salida / merma
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
            Cantidad {esKg ? '(kg)' : '(unidades)'}
          </label>
          <Input
            type="number"
            min={step}
            step={step}
            placeholder={placeholder}
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className="h-9 bg-background/40 border-border/60 text-sm font-mono tabular-nums"
          />
        </div>
        <Button type="submit" disabled={isPending} className="h-9 px-4 glow-primary">
          {isPending ? 'Guardando...' : 'Confirmar'}
        </Button>
      </form>

      {cantidad && (
        <div className="mt-4 px-3 py-2 rounded-md bg-muted/50 border border-border/40">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Stock resultante</span>
            <div className="flex items-center gap-2 font-mono tabular-nums">
              <span className="text-muted-foreground">
                {esKg ? `${stockActual.toFixed(3)} kg` : `${stockActual} un`}
              </span>
              <span className="text-muted-foreground/40">→</span>
              <span className={`font-semibold ${preview < 0 ? 'text-destructive' : tipo === 'entrada' ? 'text-success' : 'text-foreground'}`}>
                {esKg ? `${preview.toFixed(3)} kg` : `${Math.round(preview)} un`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
