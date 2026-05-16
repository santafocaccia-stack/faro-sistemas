'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Boxes, Target, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ajustarStock, fijarStock } from '@/server/actions/productos';
import type { TipoUnidad } from '@/server/db/schema';

type Props = {
  productoId: string;
  stockActual: number;
  tipoUnidad: TipoUnidad;
};

type Modo = 'entrada' | 'salida' | 'fijar';

export function AjusteStockForm({ productoId, stockActual, tipoUnidad }: Props) {
  const [modo, setModo] = useState<Modo>('entrada');
  const [cantidad, setCantidad] = useState('');
  const [confirmarCero, setConfirmarCero] = useState(false);
  const [isPending, startTransition] = useTransition();

  const esKg = tipoUnidad === 'por_kg';
  const step = esKg ? '0.001' : '1';
  const placeholder = esKg ? '0.000' : '0';

  const preview = cantidad
    ? modo === 'entrada' ? stockActual + Number(cantidad)
    : modo === 'salida'  ? stockActual - Number(cantidad)
    : Number(cantidad)
    : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cantidad || Number(cantidad) < 0) { toast.error('Ingresá una cantidad válida'); return; }
    if (modo === 'fijar' && Number(cantidad) === 0 && !confirmarCero) {
      setConfirmarCero(true);
      return;
    }

    startTransition(async () => {
      try {
        if (modo === 'fijar') {
          await fijarStock({ productoId, nuevoStock: cantidad });
          toast.success('Stock actualizado correctamente');
        } else {
          await ajustarStock({ productoId, tipo: modo, cantidad });
          toast.success(modo === 'entrada' ? 'Stock ingresado' : 'Stock descontado');
        }
        setCantidad('');
        setConfirmarCero(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al ajustar stock');
      }
    });
  }

  function handleReiniciarCero() {
    if (!confirmarCero) {
      setModo('fijar');
      setCantidad('0');
      setConfirmarCero(true);
      return;
    }
    startTransition(async () => {
      try {
        await fijarStock({ productoId, nuevoStock: '0' });
        toast.success('Stock reiniciado a cero');
        setCantidad('');
        setConfirmarCero(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error');
      }
    });
  }

  const MODOS: { value: Modo; label: string; icon: React.ElementType; color: string }[] = [
    { value: 'entrada', label: 'Entrada',        icon: ArrowUp,   color: 'text-success' },
    { value: 'salida',  label: 'Salida / merma', icon: ArrowDown, color: 'text-destructive' },
    { value: 'fijar',   label: 'Fijar cantidad', icon: Target,    color: 'text-primary' },
  ];

  return (
    <div id="stock" className="rounded-xl border border-border bg-card p-5 scroll-mt-6">
      <div className="flex items-center justify-between gap-2.5 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Boxes className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Ajustar stock</h2>
            <p className="text-[11px] text-muted-foreground">Compras, mermas o correcciones</p>
          </div>
        </div>

        {/* Reiniciar a cero — acción destructiva rápida */}
        {stockActual > 0 && (
          <button
            type="button"
            onClick={handleReiniciarCero}
            disabled={isPending}
            className="text-[11px] text-muted-foreground/60 hover:text-destructive transition-colors underline underline-offset-2"
          >
            Reiniciar a cero
          </button>
        )}
      </div>

      {/* Confirmación de reinicio a cero */}
      {confirmarCero && modo === 'fijar' && Number(cantidad) === 0 && (
        <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-medium text-destructive">Vas a reiniciar el stock a cero</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Esto sobrescribe el stock actual ({esKg ? `${stockActual.toFixed(3)} kg` : `${stockActual} un`}). ¿Confirmar?</p>
          </div>
          <button
            type="button"
            onClick={() => { setConfirmarCero(false); setCantidad(''); }}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Selector de modo — 3 opciones */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg mb-4">
        {MODOS.map(({ value, label, icon: Icon, color }) => (
          <button
            key={value}
            type="button"
            onClick={() => { setModo(value); setCantidad(''); setConfirmarCero(false); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[12px] font-medium transition-all duration-150 ${
              modo === value
                ? `bg-card ${color} shadow-[0_1px_2px_oklch(0_0_0_/_0.3)]`
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{value === 'entrada' ? 'Entrada' : value === 'salida' ? 'Salida' : 'Fijar'}</span>
          </button>
        ))}
      </div>

      {/* Descripción del modo */}
      <p className="text-[11px] text-muted-foreground mb-3 -mt-1">
        {modo === 'entrada' && 'Suma al stock existente (ej: llegó mercadería).'}
        {modo === 'salida'  && 'Resta del stock existente (ej: merma, ajuste manual).'}
        {modo === 'fijar'   && 'Establece el stock exacto (ej: inventario físico).'}
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
            {modo === 'fijar' ? 'Nuevo stock' : 'Cantidad'} {esKg ? '(kg)' : '(unidades)'}
          </label>
          <Input
            type="number"
            min={modo === 'fijar' ? '0' : step}
            step={step}
            placeholder={placeholder}
            value={cantidad}
            onChange={(e) => { setCantidad(e.target.value); setConfirmarCero(false); }}
            className="h-9 bg-background/40 border-border/60 text-sm font-mono tabular-nums"
          />
        </div>
        <Button
          type="submit"
          disabled={isPending || !cantidad}
          className="h-9 px-4 glow-primary"
        >
          {isPending ? 'Guardando...' : confirmarCero ? 'Sí, reiniciar' : 'Confirmar'}
        </Button>
      </form>

      {/* Preview del resultado */}
      {preview !== null && !isNaN(preview) && (
        <div className="mt-4 px-3 py-2 rounded-md bg-muted/50 border border-border/40">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Stock resultante</span>
            <div className="flex items-center gap-2 font-mono tabular-nums">
              <span className="text-muted-foreground">
                {esKg ? `${stockActual.toFixed(3)} kg` : `${stockActual} un`}
              </span>
              <span className="text-muted-foreground/40">→</span>
              <span className={`font-semibold ${
                preview < 0                  ? 'text-destructive'
                : modo === 'entrada'         ? 'text-success'
                : modo === 'fijar'           ? 'text-primary'
                : 'text-foreground'
              }`}>
                {esKg ? `${preview.toFixed(3)} kg` : `${Math.round(preview)} un`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
