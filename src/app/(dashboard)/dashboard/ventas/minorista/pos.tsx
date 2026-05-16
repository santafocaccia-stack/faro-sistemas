'use client';

import { useState, useTransition, useMemo, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, Minus, Trash2, ShoppingCart, Check, Scale, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn, formatARS, formatKg } from '@/lib/utils';
import { crearVenta, type LineaVenta } from '@/server/actions/ventas';
import type { Producto, Cliente, MetodoPago } from '@/server/db/schema';

type CartItem = {
  producto: Producto;
  cantidad: number;         // para por_unidad: entero; para por_kg: decimal en kg
  precioUnitario: number;
};

// Modal para ingresar cantidad (especialmente útil para kg)
function CantidadModal({
  producto,
  onConfirmar,
  onCancelar,
}: {
  producto: Producto;
  onConfirmar: (cantidad: number) => void;
  onCancelar: () => void;
}) {
  const [valor, setValor] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const esKg = producto.tipoUnidad === 'por_kg';

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleConfirm() {
    const n = Number(valor);
    if (!valor || isNaN(n) || n <= 0) { toast.error('Ingresá una cantidad válida'); return; }
    onConfirmar(n);
  }

  const preview = valor && !isNaN(Number(valor)) && Number(valor) > 0
    ? Number(valor) * Number(producto.precioMinorista)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancelar} />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl animate-fade-up">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            {esKg ? <Scale className="h-3.5 w-3.5 text-primary" /> : <Hash className="h-3.5 w-3.5 text-primary" />}
          </div>
          <div>
            <p className="text-sm font-semibold">{producto.nombre}</p>
            <p className="text-[11px] text-muted-foreground">
              {formatARS(Number(producto.precioMinorista))} / {esKg ? 'kg' : 'unidad'}
            </p>
          </div>
        </div>

        <div className="space-y-1.5 mb-4">
          <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
            {esKg ? 'Peso (kg)' : 'Cantidad (unidades)'}
          </label>
          <Input
            ref={inputRef}
            type="number"
            inputMode={esKg ? 'decimal' : 'numeric'}
            step={esKg ? '0.001' : '1'}
            min={esKg ? '0.001' : '1'}
            placeholder={esKg ? '0.000' : '1'}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            className="h-12 text-lg font-mono tabular-nums text-center bg-background/40 border-border/60"
          />
        </div>

        {preview !== null && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-muted/50 border border-border/40 text-center">
            <span className="text-lg font-bold font-mono tabular-nums">{formatARS(preview)}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onCancelar}
            className="h-10 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <Button
            onClick={handleConfirm}
            disabled={!valor || Number(valor) <= 0}
            className="h-10 glow-primary"
          >
            Agregar
          </Button>
        </div>
      </div>
    </div>
  );
}

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: 'efectivo',        label: 'Efectivo' },
  { value: 'transferencia',   label: 'Transferencia' },
  { value: 'tarjeta_debito',  label: 'Tarjeta débito' },
  { value: 'tarjeta_credito', label: 'Tarjeta crédito' },
  { value: 'mercado_pago',    label: 'Mercado Pago' },
];

type Props = {
  productos: Producto[];
  clientes: Cliente[];
  consumidorFinalId: string | null;
};

export function PosMinorista({ productos, clientes, consumidorFinalId }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clienteId, setClienteId] = useState<string>(consumidorFinalId ?? '');
  const [tipoPago, setTipoPago] = useState<'contado' | 'cuenta_corriente'>('contado');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [isPending, startTransition] = useTransition();
  const [confirmado, setConfirmado] = useState(false);
  const [modalProducto, setModalProducto] = useState<Producto | null>(null);

  // Categorías únicas desde los productos
  const categorias = useMemo(() => {
    const tipos = Array.from(new Set(productos.map((p) => p.tipoUnidad)));
    return tipos.map((t) => ({ id: t, label: t === 'por_kg' ? 'Por peso' : 'Por unidad' }));
  }, [productos]);

  const productosFiltrados = useMemo(() =>
    productos.filter((p) => {
      const matchBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.codigo ?? '').toLowerCase().includes(busqueda.toLowerCase());
      const matchCategoria = !categoriaFiltro || p.tipoUnidad === categoriaFiltro;
      return matchBusqueda && matchCategoria;
    }),
    [productos, busqueda, categoriaFiltro],
  );

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId);
  const puedeUsarCC = clienteSeleccionado?.habilitaCuentaCorriente ?? false;

  function handleClickProducto(producto: Producto) {
    // Para productos por kg: siempre abrir modal
    // Para unidades: agregar 1 directamente, con modal opcional (shift + click sería ideal, por ahora click simple)
    if (producto.tipoUnidad === 'por_kg') {
      setModalProducto(producto);
    } else {
      agregarAlCarrito(producto, 1);
    }
  }

  function agregarAlCarrito(producto: Producto, cantidad: number) {
    setCart((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id);
      if (existente) {
        return prev.map((i) =>
          i.producto.id === producto.id
            ? { ...i, cantidad: i.cantidad + cantidad }
            : i,
        );
      }
      return [...prev, { producto, cantidad, precioUnitario: Number(producto.precioMinorista) }];
    });
  }

  function cambiarCantidad(productoId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => i.producto.id === productoId ? { ...i, cantidad: i.cantidad + delta } : i)
        .filter((i) => i.cantidad > 0),
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
    <>
      {modalProducto && (
        <CantidadModal
          producto={modalProducto}
          onConfirmar={(cantidad) => {
            agregarAlCarrito(modalProducto, cantidad);
            setModalProducto(null);
          }}
          onCancelar={() => setModalProducto(null)}
        />
      )}

      <div className="flex h-[calc(100vh-56px)] md:h-screen overflow-hidden">

        {/* ── Panel izquierdo: productos ── */}
        <div className="flex-1 flex flex-col border-r overflow-hidden">
          {/* Header búsqueda */}
          <div className="p-3 sm:p-4 border-b space-y-2.5">
            <h1 className="text-base font-bold hidden sm:block">Venta Minorista</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 h-9"
                placeholder="Buscar producto o código..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                autoFocus
              />
            </div>

            {/* Filtros de tipo */}
            {categorias.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                <button
                  onClick={() => setCategoriaFiltro(null)}
                  className={cn(
                    'shrink-0 px-3 h-7 rounded-full text-[11px] font-medium transition-colors',
                    !categoriaFiltro
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  Todos
                </button>
                {categorias.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategoriaFiltro(categoriaFiltro === c.id ? null : c.id)}
                    className={cn(
                      'shrink-0 px-3 h-7 rounded-full text-[11px] font-medium transition-colors',
                      categoriaFiltro === c.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grilla de productos */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {productosFiltrados.map((p) => {
                const enCarrito = cart.find((i) => i.producto.id === p.id);
                const esKg = p.tipoUnidad === 'por_kg';
                const stockNum = Number(p.stockActual);
                return (
                  <button
                    key={p.id}
                    onClick={() => handleClickProducto(p)}
                    className={cn(
                      'text-left p-3 rounded-xl border transition-all relative active:scale-[0.98]',
                      enCarrito
                        ? 'bg-primary/5 border-primary/30'
                        : 'bg-background hover:bg-muted/40 hover:border-primary/20 border-border',
                    )}
                  >
                    {/* Badge cantidad en carrito */}
                    {enCarrito && (
                      <span className="absolute top-2 right-2 h-5 w-5 bg-primary text-primary-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
                        {esKg ? formatKg(enCarrito.cantidad) : enCarrito.cantidad}
                      </span>
                    )}

                    {/* Icono tipo */}
                    <div className={cn(
                      'h-5 w-5 rounded-md flex items-center justify-center mb-2',
                      esKg ? 'bg-blue-500/10' : 'bg-muted',
                    )}>
                      {esKg
                        ? <Scale className="h-3 w-3 text-blue-500" />
                        : <Hash className="h-3 w-3 text-muted-foreground" />
                      }
                    </div>

                    <div className="font-medium text-[13px] leading-tight pr-6">{p.nombre}</div>
                    <div className="text-sm font-bold text-primary mt-1 font-mono">
                      {formatARS(Number(p.precioMinorista))}
                      <span className="text-[11px] font-normal text-muted-foreground ml-0.5">
                        /{esKg ? 'kg' : 'un'}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                      Stock: {esKg ? formatKg(stockNum) : `${stockNum} un`}
                    </div>
                  </button>
                );
              })}
              {productosFiltrados.length === 0 && (
                <p className="col-span-3 text-center text-muted-foreground py-12 text-sm">
                  No hay productos que coincidan
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Panel derecho: carrito ── */}
        <div className="w-80 lg:w-96 flex flex-col bg-background border-l">
          {/* Header carrito */}
          <div className="p-4 border-b flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Carrito</span>
            {cart.length > 0 && (
              <span className="ml-auto h-5 w-5 bg-primary text-primary-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <ShoppingCart className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Tocá un producto para agregarlo</p>
              </div>
            ) : (
              cart.map((item) => {
                const esKg = item.producto.tipoUnidad === 'por_kg';
                return (
                  <div key={item.producto.id} className="flex items-center gap-2 p-2.5 rounded-xl border border-border/60 bg-muted/20">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{item.producto.nombre}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {esKg ? `${formatKg(item.cantidad)}` : `${item.cantidad} × `}
                        {!esKg && formatARS(item.precioUnitario)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!esKg && (
                        <>
                          <button
                            className="h-6 w-6 flex items-center justify-center rounded-md border border-border hover:bg-muted transition-colors"
                            onClick={() => cambiarCantidad(item.producto.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-[13px] font-semibold tabular-nums">{item.cantidad}</span>
                        </>
                      )}
                      {esKg && (
                        <button
                          className="text-[11px] text-primary underline underline-offset-2 font-mono"
                          onClick={() => setModalProducto(item.producto)}
                        >
                          {formatKg(item.cantidad)}
                        </button>
                      )}
                    </div>
                    <div className="w-16 text-right text-[13px] font-semibold font-mono tabular-nums shrink-0">
                      {formatARS(item.cantidad * item.precioUnitario)}
                    </div>
                    <button
                      className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                      onClick={() => eliminarItem(item.producto.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer: total y cobro */}
          <div className="border-t p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total</span>
              <span className="text-xl font-bold font-mono tabular-nums">{formatARS(subtotal)}</span>
            </div>

            <Separator />

            {/* Cliente */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/70">Cliente</label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.razonSocial}{c.esConsumidorFinal && ' (CF)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de pago */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setTipoPago('contado')}
                className={cn(
                  'py-2 px-3 rounded-lg text-[13px] font-medium border transition-colors',
                  tipoPago === 'contado'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-muted',
                )}
              >
                Contado
              </button>
              <button
                onClick={() => puedeUsarCC && setTipoPago('cuenta_corriente')}
                disabled={!puedeUsarCC}
                className={cn(
                  'py-2 px-3 rounded-lg text-[13px] font-medium border transition-colors',
                  !puedeUsarCC ? 'opacity-30 cursor-not-allowed border-border' :
                  tipoPago === 'cuenta_corriente'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-muted',
                )}
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
              className="w-full h-12 text-base font-bold glow-primary"
              onClick={handleConfirmar}
              disabled={isPending || cart.length === 0}
            >
              {confirmado ? (
                <><Check className="h-5 w-5 mr-2" /> ¡Listo!</>
              ) : isPending ? (
                'Registrando...'
              ) : (
                `Cobrar ${formatARS(subtotal)}`
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
