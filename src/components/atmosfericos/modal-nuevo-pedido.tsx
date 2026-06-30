'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PedidoAtmosInput } from '@/server/actions/pedidos-atmosfericos';
import { Search, X } from 'lucide-react';

type ClienteBasico = {
  id: string;
  nombre: string;
  direccion: string | null;
  localidad: string | null;
  litrosPozo: string | null;
  telefono: string | null;
};

type Props = {
  clientes: ClienteBasico[];
  fecha: string;
  onClose: () => void;
  onCreate: (input: PedidoAtmosInput) => Promise<void>;
};

export function ModalNuevoPedido({ clientes, fecha, onClose, onCreate }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteBasico | null>(null);
  const [nombreContacto, setNombreContacto] = useState('');
  const [direccion, setDireccion] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [referencias, setReferencias] = useState('');
  const [mapsLink, setMapsLink] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);

  const clientesFiltrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.direccion ?? '').toLowerCase().includes(busqueda.toLowerCase())
  );

  function seleccionarCliente(c: ClienteBasico) {
    setClienteSeleccionado(c);
    setDireccion(c.direccion ?? '');
    setLocalidad(c.localidad ?? '');
    setBusqueda('');
  }

  function limpiarCliente() {
    setClienteSeleccionado(null);
    setDireccion('');
    setLocalidad('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!direccion) return;
    setLoading(true);
    try {
      await onCreate({
        clienteId:       clienteSeleccionado?.id ?? null,
        nombreContacto:  clienteSeleccionado
          ? clienteSeleccionado.nombre
          : (nombreContacto || null),
        direccion,
        localidad:       localidad || null,
        referencias:     referencias || null,
        mapsLink:        mapsLink || null,
        fechaProgramada: fecha,
        litrosPozo:      clienteSeleccionado?.litrosPozo ?? null,
        notas:           notas || null,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <h2 className="font-bold text-lg text-gray-900">Agregar pedido</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">

          {/* Búsqueda de cliente existente */}
          <div>
            <label className="text-sm font-semibold mb-1.5 block text-gray-700">Cliente guardado (opcional)</label>
            {clienteSeleccionado ? (
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border-2 border-blue-500 bg-blue-50">
                <div>
                  <p className="font-semibold text-gray-900">{clienteSeleccionado.nombre}</p>
                  {clienteSeleccionado.direccion && (
                    <p className="text-sm text-gray-500">{clienteSeleccionado.direccion}</p>
                  )}
                </div>
                <button type="button" onClick={limpiarCliente} className="text-gray-400 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre o dirección..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {busqueda && clientesFiltrados.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {clientesFiltrados.slice(0, 8).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => seleccionarCliente(c)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 text-base border-b last:border-0"
                      >
                        <p className="font-medium text-gray-900">{c.nombre}</p>
                        {c.direccion && <p className="text-sm text-gray-500">{c.direccion}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nombre de contacto (si no es cliente guardado) */}
          {!clienteSeleccionado && (
            <div>
              <label className="text-sm font-semibold mb-1.5 block text-gray-700">
                Nombre de contacto <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <input
                type="text"
                value={nombreContacto}
                onChange={(e) => setNombreContacto(e.target.value)}
                placeholder="Si no hay, se usa la dirección"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Dirección */}
          <div>
            <label className="text-sm font-semibold mb-1.5 block text-gray-700">Dirección *</label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Calle y número"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Localidad */}
          <div>
            <label className="text-sm font-semibold mb-1.5 block text-gray-700">Localidad</label>
            <input
              type="text"
              value={localidad}
              onChange={(e) => setLocalidad(e.target.value)}
              placeholder="Ciudad / barrio"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Referencias */}
          <div>
            <label className="text-sm font-semibold mb-1.5 block text-gray-700">Referencias</label>
            <input
              type="text"
              value={referencias}
              onChange={(e) => setReferencias(e.target.value)}
              placeholder="Casa amarilla, portón verde..."
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Maps link */}
          <div>
            <label className="text-sm font-semibold mb-1.5 block text-gray-700">
              Link de Google Maps <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <input
              type="url"
              value={mapsLink}
              onChange={(e) => setMapsLink(e.target.value)}
              placeholder="Pegá el link de la ubicación exacta"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="text-sm font-semibold mb-1.5 block text-gray-700">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Detalles adicionales..."
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12 text-base" disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 h-12 text-base font-semibold" disabled={loading || !direccion}>
              {loading ? 'Guardando...' : 'Agregar pedido'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
