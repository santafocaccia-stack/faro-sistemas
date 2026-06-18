'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PedidoDelDia } from '@/server/actions/pedidos-atmosfericos';
import type { PedidoAtmosCompletarInput } from '@/server/actions/pedidos-atmosfericos';
import { Droplets, DollarSign, X } from 'lucide-react';

type Props = {
  pedido: PedidoDelDia;
  onClose: () => void;
  onCompletar: (input: PedidoAtmosCompletarInput) => Promise<void>;
};

export function ModalCompletarPedido({ pedido, onClose, onCompletar }: Props) {
  const litrosDefault = pedido.litrosPozo ?? pedido.clienteLitrosPozo ?? '';
  const [litrosPozo, setLitrosPozo] = useState(litrosDefault ?? '');
  const [litrosExtraidos, setLitrosExtraidos] = useState('');
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [notas, setNotas] = useState('');
  const [guardarLitros, setGuardarLitros] = useState(!!pedido.clienteId);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!monto) return;
    setLoading(true);
    try {
      await onCompletar({
        litrosPozo:            litrosPozo || null,
        litrosExtraidos:       litrosExtraidos || null,
        montoCobrado:          monto,
        metodoPago,
        notas:                 notas || null,
        guardarLitrosEnCliente: guardarLitros,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-semibold">Completar servicio</h2>
            <p className="text-sm text-muted-foreground">
              {pedido.clienteNombre ?? pedido.nombreContacto ?? pedido.direccion}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          {/* Monto cobrado */}
          <div>
            <label className="text-sm font-medium flex items-center gap-1 mb-1">
              <DollarSign className="w-3.5 h-3.5" /> Monto cobrado *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0"
                required
                className="w-full pl-7 pr-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Método de pago */}
          <div>
            <label className="text-sm font-medium mb-1 block">Método de pago</label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          {/* Litros del pozo */}
          <div>
            <label className="text-sm font-medium flex items-center gap-1 mb-1">
              <Droplets className="w-3.5 h-3.5" /> Capacidad del pozo (litros)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={litrosPozo}
              onChange={(e) => setLitrosPozo(e.target.value)}
              placeholder="Ej: 2000"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {pedido.clienteId && (
              <label className="flex items-center gap-2 mt-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={guardarLitros}
                  onChange={(e) => setGuardarLitros(e.target.checked)}
                  className="rounded"
                />
                Guardar en el perfil del cliente
              </label>
            )}
          </div>

          {/* Litros extraídos */}
          <div>
            <label className="text-sm font-medium flex items-center gap-1 mb-1">
              <Droplets className="w-3.5 h-3.5 text-blue-500" /> Litros extraídos (opcional)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={litrosExtraidos}
              onChange={(e) => setLitrosExtraidos(e.target.value)}
              placeholder="Lo que se extrajo esta vez"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="text-sm font-medium mb-1 block">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Observaciones del servicio..."
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !monto}>
              {loading ? 'Guardando...' : 'Confirmar servicio'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
