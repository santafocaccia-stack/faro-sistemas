'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PedidoAtmosInput } from '@/server/actions/pedidos-atmosfericos';
import type { PedidoDelDia } from '@/server/actions/pedidos-atmosfericos';
import { X } from 'lucide-react';

type Props = {
  pedido: PedidoDelDia;
  onClose: () => void;
  onEditar: (input: PedidoAtmosInput) => Promise<void>;
};

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-input bg-background text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';
const labelCls = 'text-sm font-semibold mb-1.5 block text-foreground';

export function ModalEditarPedido({ pedido, onClose, onEditar }: Props) {
  const [nombreContacto, setNombreContacto] = useState(pedido.nombreContacto ?? '');
  const [direccion, setDireccion] = useState(pedido.direccion);
  const [localidad, setLocalidad] = useState(pedido.localidad ?? '');
  const [referencias, setReferencias] = useState(pedido.referencias ?? '');
  const [mapsLink, setMapsLink] = useState(pedido.mapsLink ?? '');
  const [notas, setNotas] = useState(pedido.notas ?? '');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!direccion) return;
    setLoading(true);
    try {
      await onEditar({
        clienteId:       pedido.clienteId ?? null,
        nombreContacto:  nombreContacto || null,
        direccion,
        localidad:       localidad || null,
        referencias:     referencias || null,
        mapsLink:        mapsLink || null,
        fechaProgramada: typeof pedido.fechaProgramada === 'string'
          ? pedido.fechaProgramada
          : new Date(pedido.fechaProgramada).toISOString().slice(0, 10),
        notas:           notas || null,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-popover text-popover-foreground rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto border border-border">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-popover z-10">
          <div>
            <h2 className="font-bold text-lg">Editar pedido</h2>
            <p className="text-sm text-muted-foreground">{pedido.clienteNombre ?? pedido.nombreContacto ?? pedido.direccion}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">

          {/* Nombre de contacto */}
          <div>
            <label className={labelCls}>Nombre de contacto</label>
            <input
              type="text"
              value={nombreContacto}
              onChange={(e) => setNombreContacto(e.target.value)}
              placeholder={pedido.direccion}
              className={inputCls}
            />
          </div>

          {/* Dirección */}
          <div>
            <label className={labelCls}>Dirección *</label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              required
              className={inputCls}
            />
          </div>

          {/* Localidad */}
          <div>
            <label className={labelCls}>Localidad</label>
            <input
              type="text"
              value={localidad}
              onChange={(e) => setLocalidad(e.target.value)}
              placeholder="Ciudad / barrio"
              className={inputCls}
            />
          </div>

          {/* Referencias */}
          <div>
            <label className={labelCls}>Referencias</label>
            <input
              type="text"
              value={referencias}
              onChange={(e) => setReferencias(e.target.value)}
              placeholder="Casa amarilla, portón verde..."
              className={inputCls}
            />
          </div>

          {/* Maps link */}
          <div>
            <label className={labelCls}>Link de Google Maps <span className="font-normal text-muted-foreground">(opcional)</span></label>
            <input
              type="url"
              value={mapsLink}
              onChange={(e) => setMapsLink(e.target.value)}
              placeholder="Pegá el link exacto de Maps"
              className={inputCls}
            />
          </div>

          {/* Notas */}
          <div>
            <label className={labelCls}>Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              placeholder="Observaciones..."
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12 text-base" disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 h-12 text-base font-semibold glow-primary" disabled={loading || !direccion}>
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
