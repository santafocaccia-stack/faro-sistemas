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

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-input bg-background text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';
const labelCls = 'text-sm font-semibold mb-1.5 block text-foreground';

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-popover text-popover-foreground rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto border border-border">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-popover z-10">
          <h2 className="font-bold text-lg">Agregar pedido</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">

          {/* Cliente guardado */}
          <div>
            <label className={labelCls}>Cliente guardado <span className="font-normal text-muted-foreground">(opcional)</span></label>
            {clienteSeleccionado ? (
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border-2 border-primary bg-primary/5">
                <div>
                  <p className="font-semibold text-foreground">{clienteSeleccionado.nombre}</p>
                  {clienteSeleccionado.direccion && (
                    <p className="text-sm text-muted-foreground">{clienteSeleccionado.direccion}</p>
                  )}
                </div>
                <button type="button" onClick={limpiarCliente} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre o dirección..."
                  className={`${inputCls} pl-10`}
                />
                {busqueda && clientesFiltrados.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-popover border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {clientesFiltrados.slice(0, 8).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => seleccionarCliente(c)}
                        className="w-full text-left px-4 py-3 hover:bg-accent text-base border-b border-border last:border-0"
                      >
                        <p className="font-medium text-foreground">{c.nombre}</p>
                        {c.direccion && <p className="text-sm text-muted-foreground">{c.direccion}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nombre de contacto */}
          {!clienteSeleccionado && (
            <div>
              <label className={labelCls}>
                Nombre de contacto <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <input
                type="text"
                value={nombreContacto}
                onChange={(e) => setNombreContacto(e.target.value)}
                placeholder="Si no hay, se usa la dirección"
                className={inputCls}
              />
            </div>
          )}

          {/* Dirección */}
          <div>
            <label className={labelCls}>Dirección *</label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Calle y número"
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
            <label className={labelCls}>
              Link de Google Maps <span className="font-normal text-muted-foreground">(opcional)</span>
            </label>
            <input
              type="url"
              value={mapsLink}
              onChange={(e) => setMapsLink(e.target.value)}
              placeholder="Pegá el link de la ubicación exacta"
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
              placeholder="Detalles adicionales..."
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12 text-base" disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 h-12 text-base font-semibold glow-primary" disabled={loading || !direccion}>
              {loading ? 'Guardando...' : 'Agregar pedido'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
