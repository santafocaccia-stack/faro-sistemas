'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { X, FileText, Loader2 } from 'lucide-react';
import { compartirPdf } from '@/lib/compartir-pdf';

type Props = {
  onClose: () => void;
};

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-input bg-background text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';
const labelCls = 'text-sm font-semibold mb-1.5 block text-foreground';

export function ModalBoletaManual({ onClose }: Props) {
  const hoy = new Date().toLocaleDateString('en-CA');
  const [direccion, setDireccion] = useState('');
  const [cliente, setCliente] = useState('');
  const [fecha, setFecha] = useState(hoy);
  const [monto, setMonto] = useState('');
  const [litros, setLitros] = useState('');
  const [metodo, setMetodo] = useState('efectivo');
  const [cargando, setCargando] = useState(false);

  const valido = direccion.trim() !== '' && Number(monto) > 0;

  async function generar() {
    if (!valido) return;
    setCargando(true);
    const params = new URLSearchParams({
      direccion: direccion.trim(),
      fecha,
      monto,
      metodo,
    });
    if (cliente.trim()) params.set('cliente', cliente.trim());
    if (litros.trim()) params.set('litros', litros.trim());
    try {
      const r = await compartirPdf(
        `/api/pdf/boleta-atmos?${params.toString()}`,
        `recibo-${fecha.replace(/-/g, '')}.pdf`,
        { title: 'Boleta', text: 'Te paso la boleta del servicio.' },
      );
      if (r === 'error') { toast.error('No se pudo generar la boleta'); return; }
      if (r === 'descargado') toast.success('Boleta descargada');
      onClose();
    } catch {
      toast.error('No se pudo generar la boleta');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-popover text-popover-foreground rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto border border-border">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-popover z-10">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Generar boleta
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className={labelCls}>Dirección *</label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Calle y número"
              className={inputCls}
              autoFocus
            />
          </div>

          <div>
            <label className={labelCls}>Cliente <span className="font-normal text-muted-foreground">(opcional)</span></label>
            <input
              type="text"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Nombre del cliente"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Monto cobrado *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xl">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0"
                className="w-full pl-10 pr-4 py-4 rounded-xl border-2 border-input bg-background text-2xl font-bold text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Litros <span className="font-normal text-muted-foreground">(opc.)</span></label>
              <input
                type="number"
                inputMode="decimal"
                value={litros}
                onChange={(e) => setLitros(e.target.value)}
                placeholder="Ej: 2000"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Método de pago</label>
            <div className="flex gap-2">
              {(['efectivo', 'transferencia', 'otro'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetodo(m)}
                  className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                    metodo === m
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background text-foreground hover:bg-accent'
                  }`}
                >
                  {m === 'efectivo' ? 'Efectivo' : m === 'transferencia' ? 'Transferencia' : 'Otro'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12 text-base" disabled={cargando}>
              Cancelar
            </Button>
            <Button type="button" onClick={generar} disabled={!valido || cargando} className="flex-1 h-12 text-base font-semibold glow-primary">
              {cargando ? <Loader2 className="w-5 h-5 mr-1.5 animate-spin" /> : <FileText className="w-5 h-5 mr-1.5" />}
              {cargando ? 'Generando...' : 'Compartir boleta'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
