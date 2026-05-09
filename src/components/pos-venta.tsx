'use client';

import { useState, useTransition, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Search, Plus, Minus, Trash2, ShoppingCart, Check, Package, ScanBarcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { crearVenta, type LineaVenta } from '@/server/actions/ventas';
import { formatARS, formatKg } from '@/lib/utils';
import type { Producto, Cliente, MetodoPago, CanalVenta } from '@/server/db/schema';

type CartItem = {
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
};

const METODOS_MINORISTA: { value: MetodoPago; label: string }[] = [
  { value: 'efectivo',        label: 'Efectivo' },
  { value: 'transferencia',   label: 'Transferencia' },
  { value: 'tarjeta_debito',  label: 'Tarjeta débito' },
  { value: 'tarjeta_credito', label: 'Tarjeta crédito' },
  { value: 'mercado_pago',    label: 'Mercado Pago' },
];

const METODOS_MAYORISTA: { value: MetodoPago; label: string }[] = [
  { value: 'efectivo',        label: 'Efectivo' },
  { value: 'transferencia',   label: 'Transferencia' },
  { value: 'cheque',          label: 'Cheque' },
  { value: 'mercado_pago',    label: 'Mercado Pago' },
  { value: 'tarjeta_debito',  label: 'Tarjeta débito' },
  { value: 'tarjeta_credito', label: 'Tarjeta crédito' },
];

type Props = {
  productos: Producto[];
  clientes: Cliente[];
  consumidorFinalId: string | null;
};

export function PosVenta({ productos, clientes, consumidorFinalId }: Props) {
  const [canal, setCanal] = useState<CanalVenta>('minorista');
  const [busqueda, setBusqueda] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clienteId, setClienteId] = useState<string>(consumidorFinalId ?? '');
  const [tipoPago, setTipoPago] = useState<'contado' | 'cuenta_corriente'>('contado');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [isPending, startTransition] = useTransition();
  const [confirmado, setConfirmado] = useState(false);

  const esMayorista = canal === 'mayorista';
  const metodos = esMayorista ? METODOS_MAYORISTA : METODOS_MINORISTA;

  const clientesCanal = useMemo(() => {
    if (esMayorista) return clientes.filter((c) => c.tipo === 'mayorista' || c.tipo === 'ambos');
    return clientes.filter((c) => c.tipo === 'minorista' || c.tipo === 'ambos' || c.esConsumidorFinal);
  }, [clientes, esMayorista]);

  const productosFiltrados = useMemo(() =>
    productos.filter((p) =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo ?? '').toLowerCase().includes(busqueda.toLowerCase())
    ), [productos, busqueda]);

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId);
  const puedeUsarCC = clienteSeleccionado?.habilitaCuentaCorriente ?? false;
  const subtotal = cart.reduce((a, i) => a + i.cantidad * i.precioUnitario, 0);

  function switchCanal(nuevoCanal: CanalVenta) {
    setCanal(nuevoCanal);
    setCart([]);
    setClienteId(nuevoCanal === 'minorista' ? (consumidorFinalId ?? '') : '');
    setTipoPago('contado');
    setMetodoPago(nuevoCanal === 'mayorista' ? 'transferencia' : 'efectivo');
  }

  const agregarAlCarrito = useCallback((producto: Producto) => {
    const precio = esMayorista ? Number(producto.precioMayorista) : Number(producto.precioMinorista);
    setCart((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id);
      if (existente) return prev.map((i) => i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { producto, cantidad: 1, precioUnitario: precio }];
    });
  }, [esMayorista]);

  // ── Listener global de lector de código de barras ────────────────────────
  useEffect(() => {
    let buffer = '';
    let bufferTimer: ReturnType<typeof setTimeout> | null = null;

    // Los lectores físicos envían cada char en < 50ms y terminan con Enter.
    // Un humano tarda > 150ms entre teclas. Usamos 80ms como umbral.
    const BUFFER_TIMEOUT_MS = 80;
    const MIN_CODE_LENGTH = 3; // EAN-8 tiene 8 dígitos, pero permitimos códigos cortos

    function procesarScan(codigo: string) {
      const trimmed = codigo.trim();
      if (!trimmed || trimmed.length < MIN_CODE_LENGTH) return;

      const encontrado = productos.find(
        (p) => p.activo && p.codigo && p.codigo.trim().toLowerCase() === trimmed.toLowerCase()
      );

      if (encontrado) {
        agregarAlCarrito(encontrado);
        setBusqueda('');
        toast.success(`${encontrado.nombre} agregado al carrito`, {
          duration: 1500,
          icon: '✓',
        });
      } else {
        toast.error(`Código "${trimmed}" no encontrado`, {
          description: 'Verificá que el producto tenga el código registrado.',
          duration: 3000,
        });
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;

      // Si el foco está en un input que NO es la búsqueda del POS, no interferir
      const isFocusedOtherInput =
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) &&
        target.id !== 'pos-busqueda';

      if (isFocusedOtherInput) return;

      if (e.key === 'Enter') {
        if (bufferTimer) clearTimeout(bufferTimer);
        const codigo = buffer;
        buffer = '';
        if (codigo.length >= MIN_CODE_LENGTH) {
          e.preventDefault();
          procesarScan(codigo);
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buffer += e.key;
        // Reset buffer si el próximo char tarda demasiado (tipeo humano)
        if (bufferTimer) clearTimeout(bufferTimer);
        bufferTimer = setTimeout(() => { buffer = ''; }, BUFFER_TIMEOUT_MS);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (bufferTimer) clearTimeout(bufferTimer);
    };
  }, [productos, agregarAlCarrito]);

  function cambiarCantidad(productoId: string, delta: number) {
    setCart((prev) =>
      prev.map((i) => i.producto.id === productoId ? { ...i, cantidad: i.cantidad + delta } : i)
          .filter((i) => i.cantidad > 0)
    );
  }

  function eliminarItem(productoId: string) {
    setCart((prev) => prev.filter((i) => i.producto.id !== productoId));
  }

  function handleConfirmar() {
    if (cart.length === 0) { toast.error('El carrito está vacío'); return; }
    if (!clienteId) { toast.error('Seleccioná un cliente'); return; }
    if (tipoPago === 'cuenta_corriente' && !puedeUsarCC) {
      toast.error('Este cliente no tiene cuenta corriente habilitada'); return;
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
        await crearVenta({ canal, clienteId, tipoPago, metodoPago: tipoPago === 'contado' ? metodoPago : undefined, lineas });
        setCart([]);
        setBusqueda('');
        setClienteId(esMayorista ? '' : (consumidorFinalId ?? ''));
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
    <div className="flex h-screen overflow-hidden">

      {/* ── Panel izquierdo: productos ── */}
      <div className="flex-1 flex flex-col border-r overflow-hidden">

        {/* Header con canal + búsqueda */}
        <div className="p-4 border-b bg-card/50 space-y-3">
          {/* Canal switcher */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
            {(['minorista', 'mayorista'] as CanalVenta[]).map((c) => (
              <button
                key={c}
                onClick={() => switchCanal(c)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 capitalize ${
                  canal === c
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Búsqueda + indicador scanner */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="pos-busqueda"
              className="pl-9 pr-24 bg-background border-border/60 focus-visible:border-primary/50"
              placeholder="Buscar o escanear código de barras..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              autoFocus
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-muted-foreground/50 pointer-events-none select-none">
              <ScanBarcode className="h-3.5 w-3.5" />
              scanner activo
            </span>
          </div>
        </div>

        {/* Grid de productos */}
        <div className="flex-1 overflow-y-auto p-4">
          {productosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Sin resultados</p>
              <p className="text-xs text-muted-foreground mt-1">Probá con otro nombre o código</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {productosFiltrados.map((p) => {
                const enCarrito = cart.find((i) => i.producto.id === p.id);
                const precio = esMayorista ? Number(p.precioMayorista) : Number(p.precioMinorista);
                return (
                  <button
                    key={p.id}
                    onClick={() => agregarAlCarrito(p)}
                    className={`relative text-left p-3 rounded-xl border transition-all duration-150 ${
                      enCarrito
                        ? 'border-primary/40 bg-primary/5 shadow-[0_0_0_1px_oklch(0.78_0.16_52_/_20%)]'
                        : 'border-border/60 bg-card hover:border-border hover:bg-card/80'
                    }`}
                  >
                    {enCarrito && (
                      <span className="absolute top-2 right-2 h-5 w-5 bg-primary text-primary-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
                        {enCarrito.cantidad}
                      </span>
                    )}
                    <p className="font-medium text-sm leading-snug pr-6">{p.nombre}</p>
                    {p.categoria && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{p.categoria}</p>
                    )}
                    <p className="text-sm font-semibold text-primary mt-2">
                      {formatARS(precio)}
                      <span className="text-[11px] font-normal text-muted-foreground">
                        /{p.tipoUnidad === 'por_kg' ? 'kg' : 'un'}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {p.tipoUnidad === 'por_kg' ? formatKg(Number(p.stockActual)) : `${p.stockActual} un`}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Panel derecho: carrito ── */}
      <div className="w-80 lg:w-96 flex flex-col bg-card border-l">

        {/* Header carrito */}
        <div className="h-14 flex items-center gap-2 px-4 border-b">
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Carrito</span>
          {cart.length > 0 && (
            <Badge className="ml-auto h-5 px-1.5 text-[10px]">{cart.length}</Badge>
          )}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {cart.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center py-8"
            >
              <ShoppingCart className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Hacé click en un producto</p>
            </motion.div>
          ) : (
            <AnimatePresence initial={false}>
              {cart.map((item) => (
                <motion.div
                  key={item.producto.id}
                  layout
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-background/60 border border-border/40 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.producto.nombre}</p>
                    <p className="text-xs text-muted-foreground">{formatARS(item.precioUnitario)}/un</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => cambiarCantidad(item.producto.id, -1)}
                      className="h-6 w-6 rounded-md border border-border/60 flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <motion.span
                      key={item.cantidad}
                      initial={{ scale: 1.3 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      className="w-7 text-center text-sm font-semibold tabular-nums inline-block"
                    >
                      {item.cantidad}
                    </motion.span>
                    <button
                      onClick={() => cambiarCantidad(item.producto.id, 1)}
                      className="h-6 w-6 rounded-md border border-border/60 flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="w-20 text-right text-sm font-semibold tabular-nums shrink-0">
                    {formatARS(item.cantidad * item.precioUnitario)}
                  </p>
                  <button
                    onClick={() => eliminarItem(item.producto.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Panel de cobro */}
        <div className="border-t p-4 space-y-3 bg-card">

          {/* Total */}
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <motion.span
              key={subtotal}
              initial={{ opacity: 0.6, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              className="text-2xl font-bold tracking-tight tabular-nums"
            >
              {formatARS(subtotal)}
            </motion.span>
          </div>

          <div className="h-px bg-border/60" />

          {/* Cliente */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Cliente {esMayorista && <span className="text-destructive">*</span>}
            </label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger className="h-8 text-sm bg-background border-border/60">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {clientesCanal.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.razonSocial}{c.esConsumidorFinal && ' (CF)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de pago */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Pago</label>
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setTipoPago('contado')}
                className={`flex-1 py-1 rounded-md text-xs font-medium transition-all ${
                  tipoPago === 'contado' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Contado
              </button>
              <button
                onClick={() => puedeUsarCC && setTipoPago('cuenta_corriente')}
                className={`flex-1 py-1 rounded-md text-xs font-medium transition-all ${
                  !puedeUsarCC ? 'opacity-30 cursor-not-allowed' :
                  tipoPago === 'cuenta_corriente' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Cta. cte.
              </button>
            </div>
          </div>

          {/* Método */}
          {tipoPago === 'contado' && (
            <Select value={metodoPago} onValueChange={(v) => setMetodoPago(v as MetodoPago)}>
              <SelectTrigger className="h-8 text-sm bg-background border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {metodos.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Botón cobrar */}
          <Button
            className="w-full h-11 font-semibold text-sm shadow-[0_0_20px_oklch(0.78_0.16_52_/_25%)] transition-all"
            onClick={handleConfirmar}
            disabled={isPending || cart.length === 0 || (esMayorista && !clienteId)}
          >
            {confirmado ? (
              <span className="flex items-center gap-2"><Check className="h-4 w-4" /> Venta registrada</span>
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
