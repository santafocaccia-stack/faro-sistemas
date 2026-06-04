'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { TrendingUp, X } from 'lucide-react';
import { aplicarPreciosMasivo } from '@/server/actions/productos';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { formatARS } from '@/lib/utils';

type Prod = { id: string; nombre: string; categoriaId: string | null; precioMinorista: string; activo?: boolean };
type Cat = { id: string; nombre: string };

const REDONDEOS = [
  { v: 0, label: 'Sin redondeo' },
  { v: 10, label: 'A $10' },
  { v: 50, label: 'A $50' },
  { v: 100, label: 'A $100' },
];

export function PreciosVivos({ productos, categorias }: { productos: Prod[]; categorias: Cat[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [categoriaId, setCategoriaId] = useState('');
  const [pct, setPct] = useState('8');
  const [redondeo, setRedondeo] = useState(100);

  const calc = (v: number) => {
    if (v <= 0) return v;
    const x = v * (1 + (Number(pct) || 0) / 100);
    return redondeo > 0 ? Math.round(x / redondeo) * redondeo : Math.round(x * 100) / 100;
  };

  const afectados = useMemo(
    () => productos.filter((p) => p.activo !== false && (!categoriaId || p.categoriaId === categoriaId)),
    [productos, categoriaId],
  );
  const ejemplos = afectados.slice(0, 4);

  function aplicar() {
    start(async () => {
      const r = await aplicarPreciosMasivo({
        categoriaId: categoriaId || null,
        pct: Number(pct),
        redondeo,
      });
      if (r.ok) {
        toast.success(`${r.actualizados} precios actualizados`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 h-9 rounded-lg border border-border bg-card text-[13px] font-medium text-muted-foreground hover:text-foreground hover:border-border/80 transition-all"
        title="Actualizar precios masivamente (Precios vivos)"
      >
        <TrendingUp className="h-4 w-4" strokeWidth={1.75} />
        <span className="hidden lg:inline">Actualizar precios</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !pending && setOpen(false)} />
          <div className="panel relative w-full sm:max-w-md p-5 rounded-t-2xl sm:rounded-2xl animate-fade-up">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
                <span className="icon-chip h-8 w-8"><TrendingUp className="h-4 w-4" /></span>
                Actualizar precios
              </h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Subí (o bajá) los precios y redondealos a números lindos en un toque.
            </p>

            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Qué productos</span>
                <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}
                  className="h-9 w-full bg-background border border-border rounded-md px-3 text-sm">
                  <option value="">Todos los productos</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Variación %</span>
                  <input type="number" value={pct} onChange={(e) => setPct(e.target.value)}
                    className="h-9 w-full bg-background border border-border rounded-md px-3 text-sm font-mono"
                    placeholder="8" />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Redondeo</span>
                  <select value={redondeo} onChange={(e) => setRedondeo(Number(e.target.value))}
                    className="h-9 w-full bg-background border border-border rounded-md px-3 text-sm">
                    {REDONDEOS.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
                  </select>
                </label>
              </div>

              {/* Preview */}
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <p className="text-[11px] text-muted-foreground mb-2">
                  {afectados.length} producto{afectados.length === 1 ? '' : 's'} se van a actualizar. Ejemplos:
                </p>
                {ejemplos.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60">No hay productos en esta selección.</p>
                ) : (
                  <ul className="space-y-1">
                    {ejemplos.map((p) => {
                      const actual = Number(p.precioMinorista);
                      const nuevo = calc(actual);
                      return (
                        <li key={p.id} className="flex items-center justify-between text-[12px]">
                          <span className="truncate min-w-0 flex-1">{p.nombre}</span>
                          <span className="font-mono tabular-nums shrink-0 ml-2">
                            <span className="text-muted-foreground/60 line-through">{formatARS(actual)}</span>
                            <span className="text-primary font-semibold ml-1.5">{formatARS(nuevo)}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <ConfirmDialog
                variant="default"
                trigger={
                  <button
                    disabled={pending || afectados.length === 0}
                    className="glow-primary w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
                  >
                    {pending ? 'Actualizando…' : `Aplicar a ${afectados.length} producto${afectados.length === 1 ? '' : 's'}`}
                  </button>
                }
                title={`¿Aplicar ${Number(pct) >= 0 ? '+' : ''}${pct || 0}% a ${afectados.length} producto${afectados.length === 1 ? '' : 's'}?`}
                description={`Cambia el precio mayorista y minorista en masa${redondeo > 0 ? `, redondeando a $${redondeo}` : ''}. Podés revertir aplicando el % inverso.`}
                confirmLabel="Sí, aplicar"
                onConfirm={aplicar}
              />
              <p className="text-[10px] text-muted-foreground/60 text-center">Afecta precio mayorista y minorista. Podés revertir aplicando el % inverso.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
