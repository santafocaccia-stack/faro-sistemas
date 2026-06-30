'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PedidoDelDia } from '@/server/actions/pedidos-atmosfericos';
import type { PedidoAtmosCompletarInput } from '@/server/actions/pedidos-atmosfericos';
import { Droplets, X } from 'lucide-react';

type Props = {
  pedido: PedidoDelDia;
  onClose: () => void;
  onCompletar: (input: PedidoAtmosCompletarInput) => Promise<void>;
};

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-input bg-background text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';
const labelCls = 'text-sm font-semibold mb-1.5 block text-foreground';

export function ModalCompletarPedido({ pedido, onClose, onCompletar }: Props) {
  // Un solo campo de litros: lo que se sacó del pozo. Se pre-carga con el
  // estimado guardado del cliente (si hay) como referencia editable.
  const litrosDefault = pedido.litrosPozo ?? pedido.clienteLitrosPozo ?? '';
  const [litros, setLitros] = useState(litrosDefault);
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [notas, setNotas] = useState(pedido.notas ?? '');
  const [loading, setLoading] = useState(false);

  const titulo = pedido.clienteNombre ?? pedido.nombreContacto ?? pedido.direccion;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!monto) return;
    setLoading(true);
    try {
      await onCompletar({
        // Mismo valor en ambos: simplifica la UI (un solo "litros") y mantiene
        // compatibilidad con el guardado del estimado en el cliente.
        litrosPozo:             litros || null,
        litrosExtraidos:        litros || null,
        montoCobrado:           monto,
        metodoPago,
        notas:                  notas || null,
        guardarLitrosEnCliente: !!pedido.clienteId,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-popover text-popover-foreground rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto border border-border">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-lg">Completar servicio</h2>
            <p className="text-base text-muted-foreground">{titulo}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">

          {/* Monto cobrado — campo principal */}
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
                required
                autoFocus
                className="w-full pl-10 pr-4 py-4 rounded-xl border-2 border-input bg-background text-2xl font-bold text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Método de pago — botones grandes */}
          <div>
            <label className={labelCls}>Método de pago</label>
            <div className="flex gap-2">
              {(['efectivo', 'transferencia', 'otro'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetodoPago(m)}
                  className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                    metodoPago === m
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background text-foreground hover:bg-accent'
                  }`}
                >
                  {m === 'efectivo' ? 'Efectivo' : m === 'transferencia' ? 'Transferencia' : 'Otro'}
                </button>
              ))}
            </div>
          </div>

          {/* Litros (uno solo) */}
          <div>
            <label className={`${labelCls} flex items-center gap-1.5`}>
              <Droplets className="w-4 h-4 text-blue-600" /> Litros sacados
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={litros}
              onChange={(e) => setLitros(e.target.value)}
              placeholder="Ej: 2000"
              className={inputCls}
            />
          </div>

          {/* Notas */}
          <div>
            <label className={labelCls}>Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Observaciones del servicio..."
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12 text-base" disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 h-12 text-base font-bold bg-green-600 hover:bg-green-700 text-white"
              disabled={loading || !monto}
            >
              {loading ? 'Guardando...' : '✓ Confirmar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
