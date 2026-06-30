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

export function ModalCompletarPedido({ pedido, onClose, onCompletar }: Props) {
  const litrosDefault = pedido.litrosPozo ?? pedido.clienteLitrosPozo ?? '';
  const [litrosPozo, setLitrosPozo] = useState(litrosDefault);
  const [litrosExtraidos, setLitrosExtraidos] = useState('');
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [notas, setNotas] = useState(pedido.notas ?? '');
  const [guardarLitros, setGuardarLitros] = useState(!!pedido.clienteId);
  const [loading, setLoading] = useState(false);

  const titulo = pedido.clienteNombre ?? pedido.nombreContacto ?? pedido.direccion;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!monto) return;
    setLoading(true);
    try {
      await onCompletar({
        litrosPozo:             litrosPozo || null,
        litrosExtraidos:        litrosExtraidos || null,
        montoCobrado:           monto,
        metodoPago,
        notas:                  notas || null,
        guardarLitrosEnCliente: guardarLitros,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-bold text-lg text-gray-900">Completar servicio</h2>
            <p className="text-base text-gray-500">{titulo}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">

          {/* Monto cobrado — campo principal */}
          <div>
            <label className="text-sm font-semibold mb-1.5 block text-gray-700">
              Monto cobrado *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-xl">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0"
                required
                autoFocus
                className="w-full pl-10 pr-4 py-4 rounded-xl border-2 border-gray-300 bg-white text-2xl font-bold focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Método de pago */}
          <div>
            <label className="text-sm font-semibold mb-1.5 block text-gray-700">Método de pago</label>
            <div className="flex gap-2">
              {(['efectivo', 'transferencia', 'otro'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetodoPago(m)}
                  className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-colors ${
                    metodoPago === m
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {m === 'efectivo' ? 'Efectivo' : m === 'transferencia' ? 'Transferencia' : 'Otro'}
                </button>
              ))}
            </div>
          </div>

          {/* Litros extraídos */}
          <div>
            <label className="text-sm font-semibold mb-1.5 flex items-center gap-1 text-gray-700">
              <Droplets className="w-4 h-4 text-blue-500" /> Litros sacados
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={litrosExtraidos}
              onChange={(e) => setLitrosExtraidos(e.target.value)}
              placeholder="Lo que se extrajo"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Capacidad del pozo */}
          <div>
            <label className="text-sm font-semibold mb-1.5 flex items-center gap-1 text-gray-700">
              <Droplets className="w-4 h-4 text-gray-400" /> Capacidad del pozo (litros)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={litrosPozo}
              onChange={(e) => setLitrosPozo(e.target.value)}
              placeholder="Ej: 2000"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {pedido.clienteId && (
              <label className="flex items-center gap-2 mt-2 text-sm cursor-pointer text-gray-600">
                <input
                  type="checkbox"
                  checked={guardarLitros}
                  onChange={(e) => setGuardarLitros(e.target.checked)}
                  className="rounded w-4 h-4"
                />
                Guardar en el perfil del cliente
              </label>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="text-sm font-semibold mb-1.5 block text-gray-700">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Observaciones del servicio..."
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
