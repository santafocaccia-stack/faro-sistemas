'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Scale } from 'lucide-react';
import { formatARS } from '@/lib/utils';

export type ProductoPeso = { nombre: string; precioKg: number };

type Props = {
  /** null = cerrado. */
  producto: ProductoPeso | null;
  onClose: () => void;
  onConfirmar: (kg: number) => void;
};

/**
 * Modal para vender un producto por kilo ingresando el peso a mano
 * (cuando no se usa la balanza con etiqueta). Pide gramos, con atajos y
 * subtotal en vivo.
 */
export function PosModalPeso({ producto, onClose, onConfirmar }: Props) {
  const [gramos, setGramos] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (producto) {
      setGramos('');
      // Foco tras montar (gana sobre cualquier focus previo)
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [producto]);

  if (!producto) return null;

  const g = parseFloat(gramos.replace(',', '.')) || 0;
  const subtotal = (g / 1000) * producto.precioKg;

  function confirmar() {
    if (g <= 0) return;
    onConfirmar(g / 1000);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[75] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="w-full sm:max-w-xs bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl p-5"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <Scale className="h-4 w-4 text-primary shrink-0" />
              <h3 className="font-semibold text-sm truncate">{producto.nombre}</h3>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Cerrar">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-4">{formatARS(producto.precioKg)} /kg</p>

          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Peso en gramos</label>
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            value={gramos}
            onChange={(e) => setGramos(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') confirmar(); }}
            placeholder="Ej: 350"
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
          />

          <div className="grid grid-cols-3 gap-2 mt-3">
            {[250, 500, 1000].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setGramos(String(v))}
                className="py-1.5 rounded-lg border border-border text-xs hover:bg-muted transition-colors"
              >
                {v >= 1000 ? `${v / 1000} kg` : `${v} g`}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center mt-4 text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-bold text-primary text-base tabular-nums">{formatARS(subtotal)}</span>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmar}
              disabled={g <= 0}
              className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-40"
            >
              Agregar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
