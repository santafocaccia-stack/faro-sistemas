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
  const [litrosPozo, setLitrosPozo] = useState('');
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
    setLitrosPozo(c.litrosPozo ?? '');
    setBusqueda('');
  }

  function limpiarCliente() {
    setClienteSeleccionado(null);
    setDireccion('');
    setLocalidad('');
    setLitrosPozo('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!direccion) return;
    setLoading(true);
    try {
      await onCreate({
        clienteId:      clienteSeleccionado?.id ?? null,
        nombreContacto: clienteSeleccionado ? clienteSeleccionado.nombre : (nombreContacto || null),
        direccion,
        localidad:      localidad || null,
        referencias:    referencias || null,
        mapsLink:       mapsLink || null,
        fechaProgramada: fecha,
        litrosPozo:     litrosPozo || null,
        notas:          notas || null,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
          <h2 className="font-semibold">Agregar pedido</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">

          {/* Búsqueda de cliente */}
          <div>
            <label className="text-sm font-medium mb-1 block">Cliente existente (opcional)</label>
            {clienteSeleccionado ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg border bg-muted/30">
                <div>
                  <p className="text-sm font-medium">{clienteSeleccionado.nombre}</p>
                  {clienteSeleccionado.direccion && (
                    <p className="text-xs text-muted-foreground">{clienteSeleccionado.direccion}</p>
                  )}
                </div>
                <button type="button" onClick={limpiarCliente} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar cliente por nombre o dirección..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {busqueda && clientesFiltrados.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-background border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {clientesFiltrados.slice(0, 8).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => seleccionarCliente(c)}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-0"
                      >
                        <p className="font-medium">{c.nombre}</p>
                        {c.direccion && <p className="text-xs text-muted-foreground">{c.direccion}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nombre de contacto (si no es cliente registrado) */}
          {!clienteSeleccionado && (
            <div>
              <label className="text-sm font-medium mb-1 block">Nombre de contacto</label>
              <input
                type="text"
                value={nombreContacto}
                onChange={(e) => setNombreContacto(e.target.value)}
                placeholder="Nombre de quien atiende"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          )}

          {/* Dirección */}
          <div>
            <label className="text-sm font-medium mb-1 block">Dirección *</label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Calle y número"
              required
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Localidad */}
          <div>
            <label className="text-sm font-medium mb-1 block">Localidad</label>
            <input
              type="text"
              value={localidad}
              onChange={(e) => setLocalidad(e.target.value)}
              placeholder="Ciudad / barrio"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Referencias */}
          <div>
            <label className="text-sm font-medium mb-1 block">Referencias</label>
            <input
              type="text"
              value={referencias}
              onChange={(e) => setReferencias(e.target.value)}
              placeholder="Casa amarilla, portón verde..."
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Ubicación exacta en Maps */}
          <div>
            <label className="text-sm font-medium mb-1 block">Ubicación en Google Maps (opcional)</label>
            <input
              type="url"
              value={mapsLink}
              onChange={(e) => setMapsLink(e.target.value)}
              placeholder="Pegá el link de Maps de la ubicación"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Si la dirección no cae bien en Maps, buscala una vez, tocá «Compartir» y pegá el link acá: la ruta va directo al punto exacto.
            </p>
          </div>

          {/* Litros del pozo */}
          <div>
            <label className="text-sm font-medium mb-1 block">Litros del pozo (estimado)</label>
            <input
              type="number"
              inputMode="decimal"
              value={litrosPozo}
              onChange={(e) => setLitrosPozo(e.target.value)}
              placeholder="Ej: 2000"
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
              placeholder="Detalles adicionales..."
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !direccion}>
              {loading ? 'Guardando...' : 'Agregar pedido'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
