'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { ajustarPreciosAlMargen, type ProductoMargenBajo } from '@/server/actions/productos';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { formatARS } from '@/lib/utils';

export function MargenBajo({ items }: { items: ProductoMargenBajo[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [redondeo, setRedondeo] = useState(100);
  const [pending, start] = useTransition();

  if (items.length === 0) return null;

  function ajustar() {
    start(async () => {
      const r = await ajustarPreciosAlMargen({ redondeo });
      if (r.ok) {
        toast.success(`${r.ajustados} precios ajustados al margen objetivo`);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="panel overflow-hidden border-l-2 !border-l-warning">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <span className="h-8 w-8 rounded-lg bg-warning/15 border border-warning/25 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-4 w-4 text-warning" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">
            {items.length} producto{items.length === 1 ? '' : 's'} con margen bajo
          </p>
          <p className="text-[11px] text-muted-foreground">Estás vendiendo con menos recargo del objetivo. Tocá para ver y ajustar.</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-border/60">
          <ul className="divide-y divide-border/40 max-h-72 overflow-y-auto">
            {items.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate">{p.nombre}</p>
                  <p className="text-[11px] text-muted-foreground">
                    recargo {p.recargoReal}% <span className="text-muted-foreground/50">(objetivo {p.objetivo}%)</span>
                  </p>
                </div>
                <div className="text-right shrink-0 font-mono tabular-nums text-[12px]">
                  <span className="text-muted-foreground/60 line-through">{formatARS(p.precioActual)}</span>
                  <span className="text-success font-semibold ml-1.5">{formatARS(p.precioSugerido)}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 px-4 py-3 border-t border-border/60 bg-muted/20">
            <span className="text-[11px] text-muted-foreground">Redondear a</span>
            <select value={redondeo} onChange={(e) => setRedondeo(Number(e.target.value))}
              className="h-8 bg-background border border-border rounded-md px-2 text-xs">
              <option value={0}>Sin redondeo</option>
              <option value={10}>$10</option>
              <option value={50}>$50</option>
              <option value={100}>$100</option>
            </select>
            <ConfirmDialog
              variant="default"
              trigger={
                <button disabled={pending}
                  className="glow-primary ml-auto h-9 px-4 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold disabled:opacity-50">
                  {pending ? 'Ajustando…' : 'Ajustar al objetivo'}
                </button>
              }
              title={`¿Ajustar ${items.length} precio${items.length === 1 ? '' : 's'} al margen objetivo?`}
              description={`Se actualizará el precio minorista de ${items.length} producto${items.length === 1 ? '' : 's'} con margen bajo${redondeo > 0 ? `, redondeando a $${redondeo}` : ''}. Esta acción modifica precios en masa.`}
              confirmLabel="Sí, ajustar"
              onConfirm={ajustar}
            />
          </div>
        </div>
      )}
    </div>
  );
}
