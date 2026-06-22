'use client';

import { useState } from 'react';
import { Printer, Bluetooth, Usb, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { construirTicket, type TicketData } from '@/lib/print/escpos';
import {
  conectarBluetooth, conectarUSB, imprimir,
  estadoImpresora, soportaBluetooth, soportaUSB,
} from '@/lib/print/printer';
import type { VentaCompletada } from './pos-modal-post-venta';

const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta_debito: 'Débito',
  tarjeta_credito: 'Crédito', mercado_pago: 'Mercado Pago', cheque: 'Cheque', otro: 'Otro',
};

function ventaATicket(v: VentaCompletada): TicketData {
  return {
    negocioNombre: v.negocio.nombre,
    negocioCuit: v.negocio.cuit,
    negocioDireccion: v.negocio.direccion,
    negocioTelefono: v.negocio.telefono,
    numero: v.numero,
    fecha: v.fecha,
    clienteNombre: v.clienteNombre,
    metodoPago: v.metodoPago ? (METODO_LABEL[v.metodoPago] ?? v.metodoPago) : null,
    lineas: v.lineas,
    subtotal: v.lineas.reduce((a, l) => a + l.subtotal, 0),
    total: v.total,
  };
}

export function BotonImprimirTermica({ venta, disabled }: { venta: VentaCompletada; disabled?: boolean }) {
  const [imprimiendo, setImprimiendo] = useState(false);
  const [conectando, setConectando] = useState<null | 'bluetooth' | 'usb'>(null);
  const [elegir, setElegir] = useState(false);

  const hayBt = soportaBluetooth();
  const hayUsb = soportaUSB();

  async function doImprimir() {
    setImprimiendo(true);
    const r = await imprimir(construirTicket(ventaATicket(venta)));
    setImprimiendo(false);
    if (r.ok) toast.success('Ticket enviado a la impresora');
    else toast.error(r.error ?? 'No se pudo imprimir');
  }

  async function conectarE(modo: 'bluetooth' | 'usb') {
    setConectando(modo);
    const r = modo === 'bluetooth' ? await conectarBluetooth() : await conectarUSB();
    setConectando(null);
    if (r.ok) {
      setElegir(false);
      toast.success(`Impresora conectada: ${r.nombre}`);
      await doImprimir();
    } else {
      toast.error(r.error ?? 'No se pudo conectar');
    }
  }

  function onClick() {
    if (estadoImpresora()) doImprimir();
    else setElegir(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || imprimiendo}
        className="w-full h-11 rounded-lg flex items-center justify-center gap-1.5 bg-primary/15 hover:bg-primary/25 text-primary font-semibold text-[13px] transition-colors press-scale disabled:opacity-40"
      >
        {imprimiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" strokeWidth={2} />}
        Térmica
      </button>

      {elegir && (
        <div
          className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center p-4"
          onClick={() => setElegir(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full sm:max-w-xs p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm">Conectar impresora</h3>
              <button onClick={() => setElegir(false)} className="text-muted-foreground hover:text-foreground" aria-label="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Elegí cómo se conecta tu ticketera.</p>

            {!hayBt && !hayUsb ? (
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                Tu dispositivo no permite conexión directa (es el caso de iPhone/iPad). Usá el botón
                <span className="font-medium text-foreground"> Imprimir</span>, que sale por AirPrint o cualquier
                impresora del sistema.
              </p>
            ) : (
              <div className="space-y-2">
                {hayBt && (
                  <button
                    type="button"
                    onClick={() => conectarE('bluetooth')}
                    disabled={!!conectando}
                    className="w-full h-11 rounded-lg flex items-center justify-center gap-2 border border-border bg-background hover:bg-muted text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {conectando === 'bluetooth' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bluetooth className="h-4 w-4" />}
                    Bluetooth
                  </button>
                )}
                {hayUsb && (
                  <button
                    type="button"
                    onClick={() => conectarE('usb')}
                    disabled={!!conectando}
                    className="w-full h-11 rounded-lg flex items-center justify-center gap-2 border border-border bg-background hover:bg-muted text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {conectando === 'usb' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Usb className="h-4 w-4" />}
                    USB
                  </button>
                )}
                <p className="text-[11px] text-muted-foreground pt-1">
                  La impresora tiene que estar encendida. Se pide el permiso una sola vez por sesión.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
