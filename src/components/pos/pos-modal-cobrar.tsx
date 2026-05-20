'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Banknote, CreditCard, Smartphone, FileText, ShoppingCart } from 'lucide-react';
import { formatARS, cn } from '@/lib/utils';
import type { Cliente, MetodoPago } from '@/server/db/schema';

type Props = {
  open: boolean;
  onClose: () => void;
  total: number;
  esMayorista: boolean;
  cliente: Cliente | null;
  isPending: boolean;
  onConfirmar: (payload: {
    tipoPago: 'contado' | 'cuenta_corriente';
    metodoPago?: string;
    descuento?: string;
    notas?: string;
  }) => void;
};

const METODOS_MINORISTA: { value: MetodoPago; label: string; icon: React.ReactNode }[] = [
  { value: 'efectivo',        label: 'Efectivo',     icon: <Banknote className="h-4 w-4" /> },
  { value: 'transferencia',   label: 'Transfer.',    icon: <Smartphone className="h-4 w-4" /> },
  { value: 'mercado_pago',    label: 'Mercado Pago', icon: <Smartphone className="h-4 w-4" /> },
  { value: 'tarjeta_debito',  label: 'Débito',       icon: <CreditCard className="h-4 w-4" /> },
  { value: 'tarjeta_credito', label: 'Crédito',      icon: <CreditCard className="h-4 w-4" /> },
];

const METODOS_MAYORISTA: { value: MetodoPago; label: string; icon: React.ReactNode }[] = [
  { value: 'efectivo',        label: 'Efectivo',     icon: <Banknote className="h-4 w-4" /> },
  { value: 'transferencia',   label: 'Transfer.',    icon: <Smartphone className="h-4 w-4" /> },
  { value: 'cheque',          label: 'Cheque',       icon: <FileText className="h-4 w-4" /> },
  { value: 'mercado_pago',    label: 'Mercado Pago', icon: <Smartphone className="h-4 w-4" /> },
];

export function PosModalCobrar({
  open, onClose, total, esMayorista, cliente, isPending, onConfirmar,
}: Props) {
  const [tipoPago, setTipoPago] = useState<'contado' | 'cuenta_corriente'>('contado');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [descuento, setDescuento] = useState('');
  const [notas, setNotas] = useState('');

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setTipoPago('contado');
      setMetodoPago('efectivo');
      setDescuento('');
      setNotas('');
    }
  }, [open]);

  const metodos = esMayorista ? METODOS_MAYORISTA : METODOS_MINORISTA;
  const habilitaCC = cliente?.habilitaCuentaCorriente ?? false;
  const descNum = Number(descuento);
  const totalFinal = total - (isNaN(descNum) ? 0 : descNum);

  function confirmar() {
    onConfirmar({
      tipoPago,
      metodoPago: tipoPago === 'contado' ? metodoPago : undefined,
      descuento: descuento.trim() || undefined,
      notas: notas.trim() || undefined,
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Bottom sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-4 sm:rounded-3xl sm:max-w-md sm:w-full sm:max-h-[88vh]"
          >
            {/* Handle bar mobile */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2">
              <h2 className="text-base font-semibold tracking-tight">Confirmar venta</h2>
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Total destacado */}
            <div className="mx-5 mb-4 p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">Total a cobrar</p>
              <p className="text-[34px] font-bold font-mono tabular-nums leading-none mt-1 text-primary">
                {formatARS(totalFinal)}
              </p>
              {cliente && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Cliente: <span className="font-medium text-foreground">{cliente.razonSocial}</span>
                </p>
              )}
            </div>

            <div className="px-5 pb-5 space-y-4">

              {/* Tipo de pago */}
              {habilitaCC && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5">
                    Forma de pago
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTipoPago('contado')}
                      className={cn(
                        'h-11 rounded-lg text-[13px] font-semibold transition-all',
                        tipoPago === 'contado'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Contado
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoPago('cuenta_corriente')}
                      className={cn(
                        'h-11 rounded-lg text-[13px] font-semibold transition-all',
                        tipoPago === 'cuenta_corriente'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Cuenta corriente
                    </button>
                  </div>
                </div>
              )}

              {/* Método de pago (solo si contado) */}
              {tipoPago === 'contado' && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5">
                    Método
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {metodos.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setMetodoPago(m.value)}
                        className={cn(
                          'h-12 flex items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium transition-all',
                          metodoPago === m.value
                            ? 'bg-primary/15 text-primary border-2 border-primary/40'
                            : 'bg-muted/40 text-muted-foreground border-2 border-transparent hover:text-foreground',
                        )}
                      >
                        {m.icon}
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Descuento + notas */}
              <details className="group">
                <summary className="text-[11px] text-muted-foreground/70 cursor-pointer hover:text-foreground transition-colors select-none flex items-center gap-1.5">
                  <span className="group-open:rotate-90 transition-transform">▸</span>
                  Descuento o notas
                </summary>
                <div className="mt-2.5 space-y-2">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 block mb-1">
                      Descuento ($)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={descuento}
                      onChange={(e) => setDescuento(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm font-mono tabular-nums focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 block mb-1">
                      Notas
                    </label>
                    <input
                      type="text"
                      placeholder="Opcional"
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </div>
              </details>

              {/* Botón confirmar */}
              <button
                type="button"
                onClick={confirmar}
                disabled={isPending || totalFinal <= 0}
                className={cn(
                  'w-full h-14 rounded-xl font-bold text-base tracking-tight transition-all duration-150 press-scale flex items-center justify-center gap-2',
                  isPending || totalFinal <= 0
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:brightness-110 glow-primary',
                )}
              >
                <ShoppingCart className="h-4 w-4" strokeWidth={2.25} />
                {isPending ? 'Procesando...' : `Cobrar ${formatARS(totalFinal)}`}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
