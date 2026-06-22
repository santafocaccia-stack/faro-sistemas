'use client';

import { useState, useTransition, useMemo } from 'react';
import { toast } from 'sonner';
import { Search, Plus, Minus, Trash2, ShoppingCart, Check, Scale } from 'lucide-react';
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
  cantidad: number;          // en kg para por_kg, en unidades para por_unidad
  precioUnitario: number;
};

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: 'efectivo',          label: 'Efectivo' },
  { value: 'transferencia',     label: 'Transferencia' },
  { value: 'tarjeta_debito',    label: 'Tarjeta débito' },
  { value: 'tarjeta_credito',   label: 'Tarjeta crédito' },
  { value: 'mercado_pago',      label: 'Mercado Pago' },
];

/**
 * Intenta interpretar un código de barras de BALANZA con peso embebido
 * (EAN-13 con prefijo "2"). Formato soportado: 2 + PLU(5 díg) + peso en
 * gramos(5 díg) + dígito de control. Devuelve el PLU (sin ceros a la izq) y
 * el peso en kg, o null si no parece una etiqueta de balanza.
 */
function parseEtiquetaBalanza(code: string): { plu: string; kg: number } | null {
  if (!/^2\d{12}$/.test(code)) return null;
  const plu = String(parseInt(code.slice(1, 6), 10));
  const gramos = parseInt(code.slice(7, 12), 10);
  if (!gramos) return null;
  return { plu, kg: gramos / 1000 };
}

const redondear = (n: number) => Math.round(n * 1000) / 1000;

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

  // Modal de peso (productos por_kg)
  const [pesando, setPesando] = useState<Producto | null>(null);
  const [gramos, setGramos] = useState('');

  const productosFiltrados = useMemo(() =>
    productos.filter((p) =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo ?? '').toLowerCase().includes(busqueda.toLowerCase())
    ),
    [productos, busqueda]
  );

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId);
  const puedeUsarCC = clienteSeleccionado?.habilitaCuentaCorriente ?? false;

  /** Fija la cantidad (kg) de un producto por peso, creándolo si no estaba. */
  function fijarPeso(producto: Producto, kg: number) {
    setCart((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id);
      if (existente) {
        return prev.map((i) =>
          i.producto.id === producto.id ? { ...i, cantidad: redondear(kg) } : i
        );
      }
      return [...prev, { producto, cantidad: redondear(kg), precioUnitario: Number(producto.precioMinorista) }];
    });
  }

  function agregarAlCarrito(producto: Producto) {
    // Productos por peso: abrir el modal de peso (precargando el actual si ya está).
    if (producto.tipoUnidad === 'por_kg') {
      const existente = cart.find((i) => i.producto.id === producto.id);
      setGramos(existente ? String(Math.round(existente.cantidad * 1000)) : '');
      setPesando(producto);
      return;
    }
    setCart((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id);
      if (existente) {
        return prev.map((i) =>
          i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [...prev, { producto, cantidad: 1, precioUnitario: Number(producto.precioMinorista) }];
    });
  }

  function confirmarPeso() {
    if (!pesando) return;
    const g = parseFloat(gramos.replace(',', '.'));
    if (!g || g <= 0) { toast.error('Ingresá un peso válido'); return; }
    fijarPeso(pesando, g / 1000);
    setPesando(null);
    setGramos('');
  }

  // Lector USB (tipo supermercado): escribe el código + Enter. Soporta también
  // etiquetas de balanza con peso embebido (busca por PLU y carga el peso).
  function onBuscarKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const q = busqueda.trim();
    if (!q) return;

    // 0) etiqueta de balanza (peso embebido) → buscar por PLU
    const etiqueta = parseEtiquetaBalanza(q);
    if (etiqueta) {
      const prod = productos.find(
        (p) => (p.codigoPlu ?? '') !== '' && String(parseInt(p.codigoPlu!, 10)) === etiqueta.plu
      );
      if (prod) {
        fijarPeso(prod, etiqueta.kg);
        toast.success(`${prod.nombre} · ${formatKg(etiqueta.kg)}`);
      } else {
        toast.error(`No hay producto con PLU ${etiqueta.plu}`);
      }
      setBusqueda('');
      return;
    }

    // 1) coincidencia exacta por código de barras
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

  function cambiarCantidad(item: CartItem, dir: 1 | -1) {
    const paso = item.producto.tipoUnidad === 'por_kg' ? 0.1 : 1;
    setCart((prev) =>
      prev
        .map((i) => i.producto.id === item.producto.id
          ? { ...i, cantidad: redondear(i.cantidad + dir * paso) }
          : i)
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

  const pesoPreview = pesando
    ? (parseFloat(gramos.replace(',', '.')) || 0) / 1000 * Number(pesando.precioMinorista)
    : 0;

  return (
    <>
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
              const porKg = p.tipoUnidad === 'por_kg';
              return (
                <button
                  key={p.id}
                  onClick={() => agregarAlCarrito(p)}
                  className="text-left p-3 rounded-lg border bg-background hover:bg-muted/50 hover:border-primary transition-colors relative"
                >
                  {enCarrito && (
                    <span className="absolute top-2 right-2 h-5 min-w-5 px-1 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center font-bold">
                      {porKg ? <Check className="h-3 w-3" /> : enCarrito.cantidad}
                    </span>
                  )}
                  <div className="font-medium text-sm leading-tight flex items-center gap-1">
                    {porKg && <Scale className="h-3 w-3 text-muted-foreground shrink-0" />}
                    {p.nombre}
                  </div>
                  <div className="text-sm font-semibold text-primary mt-1">
                    {formatARS(Number(p.precioMinorista))}
                    <span className="text-xs font-normal text-muted-foreground">
                      /{porKg ? 'kg' : 'un'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Stock: {porKg ? formatKg(Number(p.stockActual)) : `${p.stockActual} un`}
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
            cart.map((item) => {
              const porKg = item.producto.tipoUnidad === 'por_kg';
              return (
              <div key={item.producto.id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/20">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.producto.nombre}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatARS(item.precioUnitario)} /{porKg ? 'kg' : 'u'}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-6 w-6"
                    onClick={() => cambiarCantidad(item, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <button
                    className={`text-center text-sm font-semibold tabular-nums ${porKg ? 'w-16 hover:text-primary' : 'w-8'}`}
                    onClick={() => porKg && agregarAlCarrito(item.producto)}
                    title={porKg ? 'Editar peso' : undefined}
                  >
                    {porKg ? formatKg(item.cantidad) : item.cantidad}
                  </button>
                  <Button size="icon" variant="outline" className="h-6 w-6"
                    onClick={() => cambiarCantidad(item, 1)}>
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
              );
            })
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

    {/* ── Modal de peso (productos por kg) ── */}
    {pesando && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={() => { setPesando(null); setGramos(''); }}
      >
        <div
          className="bg-background rounded-2xl shadow-xl w-full max-w-xs p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 mb-1">
            <Scale className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-base leading-tight">{pesando.nombre}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {formatARS(Number(pesando.precioMinorista))} /kg
          </p>

          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Peso en gramos
          </label>
          <input
            type="number"
            inputMode="decimal"
            autoFocus
            value={gramos}
            onChange={(e) => setGramos(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') confirmarPeso(); }}
            placeholder="Ej: 350"
            className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
          />

          <div className="grid grid-cols-3 gap-2 mt-3">
            {[250, 500, 1000].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGramos(String(g))}
                className="py-1.5 rounded-lg border text-xs hover:bg-muted transition-colors"
              >
                {g >= 1000 ? `${g / 1000} kg` : `${g} g`}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center mt-4 text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-bold text-primary text-base">{formatARS(pesoPreview)}</span>
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => { setPesando(null); setGramos(''); }}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={confirmarPeso}>Agregar</Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
