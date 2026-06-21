'use client';

import { useState, useTransition, useMemo } from 'react';
import { toast } from 'sonner';
import { Search, Plus, Minus, Trash2, ShoppingCart, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { crearVenta, type LineaVenta } from '@/server/actions/ventas';
import { formatARS, formatKg } from '@/lib/utils';
import type { Producto, Cliente, MetodoPago } from '@/server/db/schema';

type CartItem = {
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
};

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: 'efectivo',          label: 'Efectivo' },
  { value: 'transferencia',     label: 'Transferencia' },
  { value: 'tarjeta_debito',    label: 'Tarjeta débito' },
  { value: 'tarjeta_credito',   label: 'Tarjeta crédito' },
  { value: 'mercado_pago',      label: 'Mercado Pago' },
];

type Props = {
  productos: Producto[];
  clientes: Cliente[];
  consumidorFinalId: string | null;
};

export function PosMinorista({ productos, clientes, consumidorFinalId }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clienteId, setClienteId] = useState<string>(consumidorFinalId ?? '');
  const [tipoPago, setTipoPago] = useState<'contado' | 'cuenta_corriente'>('contado');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [isPending, startTransition] = useTransition();
  const [confirmado, setConfirmado] = useState(false);

  const productosFiltrados = useMemo(() =>
    productos.filter((p) =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo ?? '').toLowerCase().includes(busqueda.toLowerCase())
    ),
    [productos, busqueda]
  );

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId);
  const puedeUsarCC = clienteSeleccionado?.habilitaCuentaCorriente ?? false;

  function agregarAlCarrito(producto: Producto) {
    setCart((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id);
      if (existente) {
        return prev.map((i) =>
          i.producto.id === producto.id
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        );
      }
      return [...prev, { producto, cantidad: 1, precioUnitario: Number(producto.precioMinorista) }];
    });
  }

  // Lector de códigos USB (tipo supermercado): escribe el código + Enter.
  // Al Enter agregamos el producto que coincide y limpiamos para el próximo scan.
  function onBuscarKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const q = busqueda.trim();
    if (!q) return;
    // 1) coincidencia exacta por código de barras (lo que entrega el lector)
    let prod = productos.find((p) => (p.codigo ?? '').toLowerCase() === q.toLowerCase());
    // 2) si no, y la búsqueda deja un único resultado, ese
    if (!prod && productosFiltrados.length === 1) prod = productosFiltrados[0];
    if (prod) {
      agregarAlCarrito(prod);
      setBusqueda('');
    } else {
      toast.error('No se encontró un producto con ese código');
    }
  }

  function cambiarCantidad(productoId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => i.producto.id === productoId ? { ...i, cantidad: i.cantidad + delta } : i)
        .filter((i) => i.cantidad > 0)
    );
  }

  function eliminarItem(productoId: string) {
    setCart((prev) => prev.filter((i) => i.producto.id !== productoId));
  }

  const subtotal = cart.reduce((a, i) => a + i.cantidad * i.precioUnitario, 0);

  function handleConfirmar() {
    if (cart.length === 0) { toast.error('El carrito está vacío'); return; }
    if (!clienteId) { toast.error('Seleccioná un cliente'); return; }
    if (tipoPago === 'cuenta_corriente' && !puedeUsarCC) {
      toast.error('Este cliente no tiene cuenta corriente habilitada');
      return;
    }

    const lineas: LineaVenta[] = cart.map((i) => ({
      productoId: i.producto.id,
      descripcion: i.producto.nombre,
      cantidad: i.cantidad.toString(),
      precioUnitario: i.precioUnitario.toFixed(2),
      subtotal: (i.cantidad * i.precioUnitario).toFixed(2),
    }));

    startTransition(async () => {
      try {
        await crearVenta({
          canal: 'minorista',
          clienteId,
          tipoPago,
          metodoPago: tipoPago === 'contado' ? metodoPago : undefined,
          lineas,
        });
        setCart([]);
        setBusqueda('');
        setClienteId(consumidorFinalId ?? '');
        setTipoPago('contado');
        setConfirmado(true);
        toast.success('Venta registrada');
        setTimeout(() => setConfirmado(false), 2000);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al registrar la venta');
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">

      {/* ── Panel izquierdo: productos ── */}
      <div className="flex-1 flex flex-col border-r overflow-hidden">
        <div className="p-4 border-b">
          <h1 className="text-lg font-bold mb-3">Venta Minorista</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar o escanear producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={onBuscarKey}
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-2">
            {productosFiltrados.map((p) => {
              const enCarrito = cart.find((i) => i.producto.id === p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => agregarAlCarrito(p)}
                  className="text-left p-3 rounded-lg border bg-background hover:bg-muted/50 hover:border-primary transition-colors relative"
                >
                  {enCarrito && (
                    <span className="absolute top-2 right-2 h-5 w-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center font-bold">
                      {enCarrito.cantidad}
                    </span>
                  )}
                  <div className="font-medium text-sm leading-tight">{p.nombre}</div>
                  <div className="text-sm font-semibold text-primary mt-1">
                    {formatARS(Number(p.precioMinorista))}
                    <span className="text-xs font-normal text-muted-foreground">
                      /{p.tipoUnidad === 'por_kg' ? 'kg' : 'un'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Stock: {p.tipoUnidad === 'por_kg' ? formatKg(Number(p.stockActual)) : `${p.stockActual} un`}
                  </div>
                </button>
              );
            })}
            {productosFiltrados.length === 0 && (
              <p className="col-span-2 text-center text-muted-foreground py-12 text-sm">
                No hay productos que coincidan
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Panel derecho: carrito ── */}
      <div className="w-96 flex flex-col bg-background">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">Carrito</span>
            {cart.length > 0 && (
              <Badge variant="secondary">{cart.length}</Badge>
            )}
          </div>
        </div>

        {/* Items del carrito */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              Hacé click en un producto para agregarlo
            </p>
          ) : (
            cart.map((item) => (
              <div key={item.producto.id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/20">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.producto.nombre}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatARS(item.precioUnitario)} c/u
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-6 w-6"
                    onClick={() => cambiarCantidad(item.producto.id, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-semibold">{item.cantidad}</span>
                  <Button size="icon" variant="outline" className="h-6 w-6"
                    onClick={() => cambiarCantidad(item.producto.id, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="w-20 text-right text-sm font-semibold">
                  {formatARS(item.cantidad * item.precioUnitario)}
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => eliminarItem(item.producto.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Total y opciones de cobro */}
        <div className="border-t p-4 space-y-4">
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatARS(subtotal)}</span>
          </div>

          <Separator />

          {/* Cliente */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente</label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.razonSocial}
                    {c.esConsumidorFinal && ' (CF)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de pago */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTipoPago('contado')}
              className={`py-2 px-3 rounded-md text-sm font-medium border transition-colors ${
                tipoPago === 'contado'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input hover:bg-muted'
              }`}
            >
              Contado
            </button>
            <button
              onClick={() => puedeUsarCC && setTipoPago('cuenta_corriente')}
              className={`py-2 px-3 rounded-md text-sm font-medium border transition-colors ${
                !puedeUsarCC ? 'opacity-40 cursor-not-allowed' :
                tipoPago === 'cuenta_corriente'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input hover:bg-muted'
              }`}
            >
              Cta. cte.
            </button>
          </div>

          {/* Método de pago (solo contado) */}
          {tipoPago === 'contado' && (
            <Select value={metodoPago} onValueChange={(v) => setMetodoPago(v as MetodoPago)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METODOS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Botón confirmar */}
          <Button
            className="w-full h-12 text-base font-bold"
            onClick={handleConfirmar}
            disabled={isPending || cart.length === 0}
          >
            {confirmado ? (
              <><Check className="h-5 w-5 mr-2" /> Venta registrada</>
            ) : isPending ? (
              'Registrando...'
            ) : (
              `Cobrar ${formatARS(subtotal)}`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
