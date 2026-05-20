'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ConfirmacionSinStock = {
  nombre: string;
  stockActual: number;
  /** Callback que efectivamente agrega el producto al carrito */
  onAgregar: () => void;
};

type Props = {
  confirmacion: ConfirmacionSinStock | null;
  onClose: () => void;
};

/**
 * Modal de confirmación cuando se intenta agregar un producto sin stock.
 *
 * En un kiosco/super el conteo de stock nunca es perfecto — el cajero
 * tiene que poder cobrar igual. Por eso "Agregar igual" es la acción
 * primaria (naranja) y "Cancelar" la secundaria.
 */
export function PosModalSinStock({ confirmacion, onClose }: Props) {
  return (
    <AnimatePresence>
      {confirmacion && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-[65] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[65] mx-auto max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-start gap-3 px-5 pt-5 pb-3">
              <div className="h-10 w-10 rounded-xl bg-warning/15 border border-warning/25 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-warning" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold tracking-tight">Sin stock disponible</h3>
                <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                  <span className="font-medium text-foreground">{confirmacion.nombre}</span>
                  {' '}no tiene unidades en el sistema
                  {confirmacion.stockActual < 0
                    ? ` (stock: ${confirmacion.stockActual})`
                    : ' (stock: 0)'}.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-7 w-7 -mt-1 -mr-1 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors shrink-0"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Aclaración */}
            <p className="px-5 pb-4 text-[11px] text-muted-foreground/80 leading-relaxed">
              Podés agregarlo igual si el conteo del sistema está desactualizado.
              El stock va a quedar en negativo hasta que lo ajustes.
            </p>

            {/* Acciones */}
            <div className="grid grid-cols-2 gap-2 px-5 pb-5">
              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded-lg text-[13px] font-semibold bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors press-scale"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmacion.onAgregar();
                  onClose();
                }}
                className={cn(
                  'h-11 rounded-lg text-[13px] font-bold press-scale transition-all',
                  'bg-primary text-primary-foreground hover:brightness-110 glow-primary',
                )}
                autoFocus
              >
                Agregar igual
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
