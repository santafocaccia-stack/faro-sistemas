'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ejemplosPlan } from '@/lib/planes';

type Props = {
  open: boolean;
  defaultDescripcion?: string;
  plan?: string;
  onClose: () => void;
  onConfirmar: (input: { descripcion: string; precio: number; cantidad: number }) => void;
};

/**
 * Modal para agregar una línea suelta al carrito — productos sin código
 * o por peso (la balanza se ingresa manualmente acá en V1).
 */
export function PosModalLineaSuelta({ open, defaultDescripcion = '', plan, onClose, onConfirmar }: Props) {
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const descRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDescripcion(defaultDescripcion);
      setPrecio('');
      setCantidad('1');
      // Focus después de la animación
      setTimeout(() => descRef.current?.focus(), 250);
    }
  }, [open, defaultDescripcion]);

  const precioNum = Number(precio);
  const cantidadNum = Number(cantidad);
  const valido =
    descripcion.trim().length > 0 &&
    !isNaN(precioNum) && precioNum > 0 &&
    !isNaN(cantidadNum) && cantidadNum > 0;

  function confirmar() {
    if (!valido) return;
    onConfirmar({ descripcion: descripcion.trim(), precio: precioNum, cantidad: cantidadNum });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    confirmar();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border rounded-t-3xl shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-8 sm:rounded-3xl sm:max-w-sm sm:w-full"
          >
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="flex items-center justify-between px-5 pt-3 pb-3">
              <h2 className="text-base font-semibold tracking-tight">Línea suelta</h2>
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="px-5 pb-5 space-y-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 block mb-1">
                  Descripción
                </label>
                <input
                  ref={descRef}
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder={ejemplosPlan(plan).lineaSuelta}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border/60 text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 block mb-1">
                    Precio
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border/60 text-sm font-mono tabular-nums focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 block mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border/60 text-sm font-mono tabular-nums focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!valido}
                className={cn(
                  'w-full h-11 rounded-xl font-semibold text-sm tracking-tight transition-all duration-150 press-scale flex items-center justify-center gap-2 mt-2',
                  !valido
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:brightness-110',
                )}
              >
                <Plus className="h-4 w-4" strokeWidth={2.25} />
                Agregar al carrito
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
