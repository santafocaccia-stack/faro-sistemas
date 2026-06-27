'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, X, Smartphone } from 'lucide-react';
import { formatARS } from '@/lib/utils';
import {
  iniciarCobroMP,
  consultarCobroMP,
  cancelarCobroMP,
} from '@/server/actions/cobros-mp';

type Fase = 'iniciando' | 'esperando' | 'aprobado' | 'rechazado' | 'error';

type Props = {
  open: boolean;
  monto: number;
  canal: 'minorista' | 'mayorista';
  /** El pago se aprobó: registrar la venta y vincularla a este cobro. */
  onAprobado: (cobroId: string) => void;
  /** El cajero canceló / falló: volver al carrito. */
  onCancelar: () => void;
};

const POLL_MS = 2500;

/**
 * Pantalla de cobro con Mercado Pago: muestra el QR de Checkout Pro y espera
 * (polling) a que el cliente pague. El webhook marca el cobro en paralelo como
 * respaldo. Al aprobarse, dispara onAprobado para que el POS registre la venta.
 */
export function PosModalCobroMP({ open, monto, canal, onAprobado, onCancelar }: Props) {
  const [fase, setFase] = useState<Fase>('iniciando');
  const [qr, setQr] = useState<string | null>(null);
  const [initPoint, setInitPoint] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const cobroIdRef = useRef<string | null>(null);
  const aprobadoRef = useRef(false);

  // Iniciar el cobro al abrir.
  useEffect(() => {
    if (!open) return;
    let activo = true;
    setFase('iniciando');
    setQr(null);
    setInitPoint(null);
    setError('');
    cobroIdRef.current = null;
    aprobadoRef.current = false;

    (async () => {
      const r = await iniciarCobroMP({ monto, canal });
      if (!activo) return;
      if (!r.ok) {
        setError(r.error);
        setFase('error');
        return;
      }
      cobroIdRef.current = r.cobroId;
      setQr(r.qrDataUrl);
      setInitPoint(r.initPoint);
      setFase('esperando');
    })();

    return () => { activo = false; };
  }, [open, monto, canal]);

  // Polling mientras esperamos el pago.
  useEffect(() => {
    if (!open || fase !== 'esperando') return;
    let activo = true;

    const tick = async () => {
      const cobroId = cobroIdRef.current;
      if (!cobroId) return;
      const { estado } = await consultarCobroMP(cobroId);
      if (!activo) return;
      if (estado === 'aprobado') {
        if (aprobadoRef.current) return;
        aprobadoRef.current = true;
        setFase('aprobado');
        // Pequeña pausa para que se vea el ✓ antes de seguir a la venta.
        setTimeout(() => { if (activo) onAprobado(cobroId); }, 700);
      } else if (estado === 'rechazado' || estado === 'cancelado' || estado === 'expirado') {
        setFase('rechazado');
      }
    };

    const id = setInterval(tick, POLL_MS);
    return () => { activo = false; clearInterval(id); };
  }, [open, fase, onAprobado]);

  async function cancelar() {
    const cobroId = cobroIdRef.current;
    if (cobroId && !aprobadoRef.current) {
      // best-effort: no bloqueamos el cierre por esto
      cancelarCobroMP(cobroId).catch(() => {});
    }
    onCancelar();
  }

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[75] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={(e) => { if (e.target === e.currentTarget && fase !== 'aprobado') cancelar(); }}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="w-full sm:max-w-md sm:mx-4 bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="shrink-0 px-5 pt-5 pb-3 text-center relative border-b border-border/60">
            {fase !== 'aprobado' && (
              <button
                type="button"
                onClick={cancelar}
                className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                aria-label="Cancelar"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <div className="flex items-center justify-center gap-2 text-[#00b1ea]">
              <Smartphone className="h-5 w-5" />
              <span className="font-bold tracking-tight">Cobrar con Mercado Pago</span>
            </div>
            <p className="text-2xl font-bold tabular-nums mt-1">{formatARS(monto)}</p>
          </div>

          {/* Cuerpo según fase */}
          <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col items-center justify-center text-center min-h-[300px]">
            {fase === 'iniciando' && (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Generando el QR de pago…</p>
              </>
            )}

            {fase === 'esperando' && qr && (
              <>
                <div className="bg-white p-3 rounded-2xl border border-border shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt="QR de pago Mercado Pago" className="h-56 w-56" />
                </div>
                <p className="text-sm font-medium mt-4">El cliente escanea con la app de Mercado Pago</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Esperando el pago…
                </p>
                {initPoint && (
                  <a
                    href={initPoint}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-primary hover:underline mt-3"
                  >
                    Abrir link de pago
                  </a>
                )}
              </>
            )}

            {fase === 'aprobado' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 250, damping: 18 }}
                className="flex flex-col items-center"
              >
                <CheckCircle2 className="h-16 w-16 text-success" strokeWidth={2} />
                <p className="text-lg font-bold mt-3">¡Pago aprobado!</p>
                <p className="text-sm text-muted-foreground mt-1">Registrando la venta…</p>
              </motion.div>
            )}

            {(fase === 'rechazado' || fase === 'error') && (
              <>
                <XCircle className="h-14 w-14 text-destructive mb-3" strokeWidth={2} />
                <p className="text-base font-bold">
                  {fase === 'error' ? 'No se pudo iniciar el cobro' : 'El pago no se completó'}
                </p>
                {error && <p className="text-xs text-muted-foreground mt-1 max-w-xs">{error}</p>}
                {fase === 'rechazado' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Probá de nuevo o cobrá con otro método.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Acciones */}
          {fase !== 'aprobado' && (
            <div className="shrink-0 border-t border-border/60 px-5 py-3 bg-card">
              <button
                type="button"
                onClick={cancelar}
                className="w-full h-12 rounded-xl font-semibold text-sm bg-muted/60 hover:bg-muted text-foreground transition-colors press-scale"
              >
                {fase === 'rechazado' || fase === 'error' ? 'Volver al carrito' : 'Cancelar cobro'}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
