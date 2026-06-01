'use client';

import { useState } from 'react';
import { formatARS } from '@/lib/utils';

type Item = { productoId: string | null; nombre: string | null; totalCantidad: number; totalMonto: number };

/** Top productos con alternancia entre monto vendido y cantidad de unidades. */
export function TopProductos({ items }: { items: Item[] }) {
  const [modo, setModo] = useState<'monto' | 'cantidad'>('monto');

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-12">Sin datos en el período</p>;
  }

  const orden = [...items].sort((a, b) =>
    modo === 'monto' ? b.totalMonto - a.totalMonto : b.totalCantidad - a.totalCantidad,
  );
  const max = Math.max(...orden.map((x) => (modo === 'monto' ? x.totalMonto : x.totalCantidad)), 1);
  const fmtCant = (n: number) => (n % 1 === 0 ? n.toString() : n.toFixed(3));

  return (
    <div>
      {/* Toggle */}
      <div className="px-4 pt-3 flex justify-end">
        <div className="inline-flex gap-1 p-1 bg-muted rounded-lg">
          {(['monto', 'cantidad'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                modo === m ? 'bg-card text-foreground shadow-[0_1px_2px_oklch(0_0_0_/_0.3)]' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m === 'monto' ? 'Por monto' : 'Por cantidad'}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-border/40 mt-1">
        {orden.map((p, i) => {
          const val = modo === 'monto' ? p.totalMonto : p.totalCantidad;
          const pct = (val / max) * 100;
          return (
            <div key={p.productoId ?? i} className="px-4 py-2.5 list-row">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[13px] font-medium truncate min-w-0 flex-1">{p.nombre ?? 'Sin nombre'}</p>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-[13px] font-mono tabular-nums font-semibold">
                    {modo === 'monto' ? formatARS(p.totalMonto) : `${fmtCant(p.totalCantidad)} u.`}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono tabular-nums">
                    {modo === 'monto' ? `${fmtCant(p.totalCantidad)} u.` : formatARS(p.totalMonto)}
                  </p>
                </div>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
