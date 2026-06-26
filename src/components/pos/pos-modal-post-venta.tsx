'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Printer, Share2, Download, X, Loader2, Clock } from 'lucide-react';
import { formatARS } from '@/lib/utils';
import { toast } from 'sonner';
import { BotonImprimirTermica } from './boton-imprimir-termica';

/**
 * Formatea una fecha con zona horaria forzada a Argentina (UTC-3).
 * Sin esto, toLocaleString usa el timezone del dispositivo, que puede
 * estar mal configurado o ser el de un servidor (UTC).
 */
function formatFechaAR(d: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
    hour12: false,
  }).format(d);
}

export type VentaCompletada = {
  id: string;
  numero: number;
  total: number;
  canal: 'minorista' | 'mayorista';
  clienteNombre: string;
  metodoPago?: string;
  fecha: Date;
  lineas: {
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[];
  negocio: {
    nombre: string;
    cuit?: string | null;
    direccion?: string | null;
    telefono?: string | null;
  };
  /** true mientras el server action todavía no respondió */
  procesando?: boolean;
};

type Props = {
  venta: VentaCompletada | null;
  onCerrar: () => void;
  onSeguirVendiendo: () => void;
};

/**
 * Modal que aparece después de una venta exitosa. Permite:
 *  - Imprimir el ticket (80mm térmico o A4 común — el browser elige)
 *  - Compartir/descargar PDF
 *  - Seguir vendiendo (cierra el modal y limpia carrito)
 *
 * El ticket HTML se renderiza visualmente en el modal y también queda
 * preparado en print-only para que window.print() lo use.
 */
export function PostVentaModal({ venta, onCerrar, onSeguirVendiendo }: Props) {
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [esTouch, setEsTouch] = useState(false);

  // Detectar si es un dispositivo táctil (mobile/tablet) para elegir
  // entre "Compartir" (Web Share) y "Descargar PDF"
  useEffect(() => {
    setEsTouch(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  // Auto-focus en el botón principal al abrir
  useEffect(() => {
    if (venta) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Enter') onSeguirVendiendo();
        if (e.key === 'Escape') onCerrar();
        if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
          e.preventDefault();
          window.print();
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [venta, onCerrar, onSeguirVendiendo]);

  function imprimir() {
    window.print();
  }

  function descargarPdf(url: string, filename: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Ticket descargado');
  }

  async function compartirOPdf() {
    if (!venta) return;
    setDescargandoPdf(true);
    const url = `/api/pdf/remito/${venta.id}`;
    const filename = `ticket-${String(venta.numero).padStart(5, '0')}.pdf`;

    try {
      // En DESKTOP (puntero fino, sin touch) la Web Share API de archivos
      // es errática y no ofrece "descargar". Vamos directo a la descarga.
      const esTouch =
        typeof window !== 'undefined' &&
        window.matchMedia('(pointer: coarse)').matches;

      if (!esTouch) {
        descargarPdf(url, filename);
        return;
      }

      // MOBILE: intentar Web Share API con el archivo (sheet nativo)
      if ('canShare' in navigator) {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error('Error al generar PDF');
          const blob = await res.blob();
          const file = new File([blob], filename, { type: 'application/pdf' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: `Ticket #${venta.numero}` });
            return;
          }
        } catch (err) {
          // Si el usuario cancela el sheet, no hacemos nada más
          if (err instanceof Error && err.name === 'AbortError') return;
          // Cualquier otro error → caemos en descarga
        }
      }

      // Fallback mobile sin Web Share
      descargarPdf(url, filename);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo generar el PDF');
    } finally {
      setDescargandoPdf(false);
    }
  }

  if (!venta) return null;

  return (
    <>
      {/* ── Versión print-only del ticket ──
          Se renderiza vía portal a document.body para que NO quede dentro del
          contenedor raíz del POS (que es `.screen-only` y por ende `display:none`
          al imprimir). Sin el portal, el ticket print-only queda oculto bajo un
          ancestro display:none y la hoja sale en blanco. */}
      {typeof document !== 'undefined' &&
        createPortal(<TicketImprimible venta={venta} />, document.body)}

      {/* ── Modal visible en pantalla ── */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="screen-only fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) onSeguirVendiendo(); }}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="w-full sm:max-w-md sm:mx-4 bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
          >
            {/* Handle bar mobile */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header con check de éxito */}
            <div className="shrink-0 px-5 pt-3 pb-4 text-center relative">
              <button
                type="button"
                onClick={onSeguirVendiendo}
                className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>

              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 250, damping: 18, delay: 0.1 }}
                className={`h-14 w-14 mx-auto rounded-full flex items-center justify-center mb-3 ${
                  venta.procesando
                    ? 'bg-muted border-2 border-border'
                    : 'bg-success/15 border-2 border-success/30'
                }`}
              >
                {venta.procesando
                  ? <Loader2 className="h-7 w-7 text-muted-foreground animate-spin" />
                  : <CheckCircle2 className="h-7 w-7 text-success" strokeWidth={2.25} />
                }
              </motion.div>

              <h2 className="text-lg font-bold tracking-tight">
                {venta.procesando ? 'Guardando venta...' : '¡Venta registrada!'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                {venta.procesando
                  ? <><Clock className="h-3 w-3" /> Asignando número de ticket...</>
                  : <>Ticket #{String(venta.numero).padStart(5, '0')} · {formatARS(venta.total)}</>
                }
              </p>
            </div>

            {/* Preview compacto del ticket */}
            <div className="flex-1 overflow-y-auto px-5 pb-3">
              <div className="bg-muted/30 border border-border/60 rounded-xl p-4 font-mono text-[11px] leading-relaxed">
                <p className="text-center font-bold text-[13px] tracking-tight">
                  {venta.negocio.nombre.toUpperCase()}
                </p>
                {venta.negocio.cuit && (
                  <p className="text-center text-muted-foreground text-[10px] mt-0.5">
                    CUIT {venta.negocio.cuit}
                  </p>
                )}

                <div className="my-2 border-t border-dashed border-border" />

                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    Ticket #
                    {venta.procesando
                      ? <Loader2 className="h-2.5 w-2.5 animate-spin inline" />
                      : String(venta.numero).padStart(5, '0')
                    }
                  </span>
                  <span>{formatFechaAR(venta.fecha)}</span>
                </div>

                <div className="my-2 border-t border-dashed border-border" />

                {venta.lineas.map((l, i) => (
                  <div key={i} className="mb-1.5">
                    <p className="font-semibold text-foreground">{l.descripcion}</p>
                    <div className="flex justify-between text-muted-foreground">
                      <span>{l.cantidad} × {formatARS(l.precioUnitario)}</span>
                      <span className="tabular-nums">{formatARS(l.subtotal)}</span>
                    </div>
                  </div>
                ))}

                <div className="my-2 border-t border-dashed border-border" />

                <div className="flex justify-between text-[14px] font-bold text-foreground">
                  <span>TOTAL</span>
                  <span className="tabular-nums">{formatARS(venta.total)}</span>
                </div>

                {venta.metodoPago && (
                  <p className="text-center text-[10px] text-muted-foreground mt-2">
                    {venta.metodoPago.replace('_', ' ').toUpperCase()}
                  </p>
                )}

                <p className="text-center text-[10px] text-muted-foreground mt-3">
                  ¡Gracias por su compra!
                </p>
              </div>
            </div>

            {/* Acciones */}
            <div className="shrink-0 border-t border-border/60 px-5 py-3 space-y-2 bg-card">
              <BotonImprimirTermica venta={venta} disabled={!!venta.procesando} />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={imprimir}
                  disabled={!!venta.procesando}
                  className="h-11 rounded-lg flex items-center justify-center gap-1.5 bg-muted/50 hover:bg-muted text-foreground font-semibold text-[13px] transition-colors press-scale disabled:opacity-40"
                >
                  <Printer className="h-4 w-4" strokeWidth={2} />
                  Imprimir
                </button>
                <button
                  type="button"
                  onClick={compartirOPdf}
                  disabled={descargandoPdf || !!venta.procesando}
                  className="h-11 rounded-lg flex items-center justify-center gap-1.5 bg-muted/50 hover:bg-muted text-foreground font-semibold text-[13px] transition-colors press-scale disabled:opacity-40"
                >
                  {descargandoPdf
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : esTouch
                      ? <Share2 className="h-4 w-4" strokeWidth={2} />
                      : <Download className="h-4 w-4" strokeWidth={2} />
                  }
                  {descargandoPdf ? '...' : esTouch ? 'Compartir' : 'Descargar PDF'}
                </button>
              </div>

              <button
                type="button"
                onClick={onSeguirVendiendo}
                className="w-full h-12 rounded-xl font-bold text-base bg-primary text-primary-foreground hover:brightness-110 transition-all press-scale glow-primary"
                autoFocus
              >
                Seguir vendiendo
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// Ticket print-only — se renderiza vacío en pantalla pero visible al imprimir
// Optimizado para impresoras térmicas 80mm (también funciona en A4)
// ─────────────────────────────────────────────────────────────────
function TicketImprimible({ venta }: { venta: VentaCompletada }) {
  return (
    <div
      className="print-only ticket-page hidden"
      style={{
        fontFamily: 'monospace',
        padding: '6mm 4mm',
        width: '72mm', // 80mm - 4mm de cada lado
        fontSize: '10px',
        lineHeight: 1.4,
        color: '#000',
        background: '#fff',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        <strong style={{ fontSize: 13, letterSpacing: 0.5 }}>
          {venta.negocio.nombre.toUpperCase()}
        </strong>
        {venta.negocio.cuit && (
          <div style={{ fontSize: 9 }}>CUIT {venta.negocio.cuit}</div>
        )}
        {venta.negocio.direccion && (
          <div style={{ fontSize: 9 }}>{venta.negocio.direccion}</div>
        )}
        {venta.negocio.telefono && (
          <div style={{ fontSize: 9 }}>Tel. {venta.negocio.telefono}</div>
        )}
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
        <span>Ticket #{String(venta.numero).padStart(5, '0')}</span>
        <span>{formatFechaAR(venta.fecha)}</span>
      </div>

      <div style={{ fontSize: 9, marginTop: 2 }}>
        Cliente: {venta.clienteNombre}
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      {venta.lineas.map((l, i) => (
        <div key={i} style={{ marginBottom: 3 }}>
          <div style={{ fontWeight: 'bold' }}>{l.descripcion}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
            <span>{l.cantidad} × {formatARS(l.precioUnitario)}</span>
            <span>{formatARS(l.subtotal)}</span>
          </div>
        </div>
      ))}

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 'bold',
          fontSize: 14,
        }}
      >
        <span>TOTAL</span>
        <span>{formatARS(venta.total)}</span>
      </div>

      {venta.metodoPago && (
        <div style={{ textAlign: 'center', fontSize: 9, marginTop: 4 }}>
          {venta.metodoPago.replace('_', ' ').toUpperCase()}
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: 9, marginTop: 8 }}>
        ¡Gracias por su compra!
      </div>
    </div>
  );
}

