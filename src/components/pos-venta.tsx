'use client';

import {
  useState, useTransition, useMemo, useEffect, useCallback, useRef,
} from 'react';
import { toast } from 'sonner';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Check,
  Package, ScanBarcode, Scale, X, ChevronRight,
  Banknote, CreditCard, Smartphone, ArrowRight,
  Store, Users2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { crearVenta, type LineaVenta } from '@/server/actions/ventas';
import { formatARS, formatKg, cn } from '@/lib/utils';
import type { Producto, Cliente, MetodoPago, CanalVenta, Categoria } from '@/server/db/schema';
import dynamic from 'next/dynamic';

// Lazy: el scanner de cámara pesa ~40kB; solo lo cargamos si el usuario lo abre
const BarcodeScannerModal = dynamic(
  () => import('@/components/barcode-scanner-modal').then((m) => ({ default: m.BarcodeScannerModal })),
  { ssr: false },
);

/* ─────────────────────────────────────────────────────────────
   Tipos
───────────────────────────────────────────────────────────── */
type CartItem = {
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
};

/* ─────────────────────────────────────────────────────────────
   Constantes
───────────────────────────────────────────────────────────── */
const METODOS_MINORISTA: { value: MetodoPago; label: string; icon: React.ReactNode }[] = [
  { value: 'efectivo',        label: 'Efectivo',        icon: <Banknote className="h-3.5 w-3.5" /> },
  { value: 'transferencia',   label: 'Transferencia',   icon: <Smartphone className="h-3.5 w-3.5" /> },
  { value: 'tarjeta_debito',  label: 'Débito',          icon: <CreditCard className="h-3.5 w-3.5" /> },
  { value: 'tarjeta_credito', label: 'Crédito',         icon: <CreditCard className="h-3.5 w-3.5" /> },
  { value: 'mercado_pago',    label: 'Mercado Pago',    icon: <Smartphone className="h-3.5 w-3.5" /> },
];

const METODOS_MAYORISTA: { value: MetodoPago; label: string; icon: React.ReactNode }[] = [
  { value: 'efectivo',        label: 'Efectivo',        icon: <Banknote className="h-3.5 w-3.5" /> },
  { value: 'transferencia',   label: 'Transferencia',   icon: <Smartphone className="h-3.5 w-3.5" /> },
  { value: 'cheque',          label: 'Cheque',          icon: <CreditCard className="h-3.5 w-3.5" /> },
  { value: 'mercado_pago',    label: 'Mercado Pago',    icon: <Smartphone className="h-3.5 w-3.5" /> },
  { value: 'tarjeta_debito',  label: 'Débito',          icon: <CreditCard className="h-3.5 w-3.5" /> },
  { value: 'tarjeta_credito', label: 'Crédito',         icon: <CreditCard className="h-3.5 w-3.5" /> },
];

/* Paleta de colores para las iniciales de productos */
const CARD_COLORS = [
  'bg-orange-500/15 text-orange-400',
  'bg-blue-500/15 text-blue-400',
  'bg-emerald-500/15 text-emerald-400',
  'bg-violet-500/15 text-violet-400',
  'bg-rose-500/15 text-rose-400',
  'bg-amber-500/15 text-amber-400',
  'bg-cyan-500/15 text-cyan-400',
  'bg-pink-500/15 text-pink-400',
];

function getColorClass(nombre: string): string {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length]!;
}

/* ─────────────────────────────────────────────────────────────
   Sub-componente: Tarjeta de producto
───────────────────────────────────────────────────────────── */
function ProductCard({
  producto,
  enCarrito,
  precio,
  esMayorista,
  onClick,
}: {
  producto: Producto;
  enCarrito: CartItem | undefined;
  precio: number;
  esMayorista: boolean;
  onClick: () => void;
}) {
  const esKg = producto.tipoUnidad === 'por_kg';
  const stockNum = Number(producto.stockActual);
  const stockBajo = producto.stockMinimo !== null && stockNum <= Number(producto.stockMinimo);
  const colorClass = getColorClass(producto.nombre);
  const inicial = producto.nombre.charAt(0).toUpperCase();

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col text-left rounded-xl border transition-all duration-150',
        'active:scale-[0.97] select-none',
        enCarrito
          ? 'border-primary/40 bg-primary/[0.07] shadow-[0_0_0_1px_oklch(0.70_0.22_43_/_18%)]'
          : 'border-border/60 bg-card hover:border-primary/30 hover:bg-card/80',
      )}
    >
      {/* Badge cantidad en carrito — CSS transition reemplaza Framer Motion por perf */}
      <span
        className={cn(
          'absolute top-2 right-2 z-10 min-w-[1.25rem] h-5 px-1 bg-primary text-primary-foreground rounded-full text-[10px] font-bold flex items-center justify-center leading-none',
          'transition-[transform,opacity] duration-150 ease-out',
          enCarrito ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none',
        )}
        aria-hidden={!enCarrito}
      >
        {enCarrito
          ? (esKg
            ? `${enCarrito.cantidad.toLocaleString('es-AR', { maximumFractionDigits: 2 })}k`
            : enCarrito.cantidad)
          : null}
      </span>

      {/* Área superior: icono / inicial */}
      <div className="p-3 pb-0">
        <div className={cn(
          'h-10 w-10 rounded-lg flex items-center justify-center mb-2.5 text-base font-bold',
          colorClass,
        )}>
          {esKg ? <Scale className="h-4.5 w-4.5" strokeWidth={1.75} /> : inicial}
        </div>

        {/* Nombre */}
        <p className="font-medium text-[13px] leading-snug line-clamp-2 pr-5 min-h-[2.4em]">
          {producto.nombre}
        </p>
      </div>

      {/* Precio */}
      <div className="px-3 mt-auto pt-2 pb-2.5">
        <p className={cn(
          'text-[17px] font-bold font-mono tabular-nums leading-tight',
          enCarrito ? 'text-primary' : 'text-foreground',
        )}>
          {formatARS(precio)}
          <span className="text-[11px] font-normal text-muted-foreground ml-0.5">
            /{esKg ? 'kg' : 'un'}
          </span>
        </p>

        {/* Stock */}
        <p className={cn(
          'text-[10px] mt-0.5 tabular-nums font-mono',
          stockBajo ? 'text-warning' : 'text-muted-foreground/60',
        )}>
          {stockBajo && '⚠ '}
          {esKg ? formatKg(stockNum) : `${stockNum} un`}
        </p>
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   Sub-componente: Empty state del carrito
───────────────────────────────────────────────────────────── */
function EmptyCart({ esMayorista }: { esMayorista: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8 gap-3">
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" />
        <div className="relative h-16 w-16 rounded-2xl bg-muted border border-border flex items-center justify-center">
          <ShoppingCart className="h-7 w-7 text-muted-foreground/40" strokeWidth={1.5} />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground/70">Carrito vacío</p>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-[160px] mx-auto">
          {esMayorista
            ? 'Buscá un producto o escaneá un código para agregar'
            : 'Tocá un producto para sumarlo al pedido'}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Componente principal
───────────────────────────────────────────────────────────── */
type Props = {
  productos: Producto[];
  clientes: Cliente[];
  consumidorFinalId: string | null;
  categorias: Categoria[];
};

export function PosVenta({ productos, clientes, consumidorFinalId, categorias }: Props) {
  /* ── Estado ─────────────────────────────────────────────── */
  const [canal, setCanal] = useState<CanalVenta>('minorista');
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [variantesGrupo, setVariantesGrupo] = useState<Producto[] | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clienteId, setClienteId] = useState<string>(consumidorFinalId ?? '');
  const [tipoPago, setTipoPago] = useState<'contado' | 'cuenta_corriente'>('contado');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [isPending, startTransition] = useTransition();
  const [confirmado, setConfirmado] = useState(false);
  const [mobileView, setMobileView] = useState<'productos' | 'carrito'>('productos');

  // Modal peso (por_kg)
  const [pesoModal, setPesoModal] = useState<Producto | null>(null);
  const [pesoInput, setPesoInput] = useState('');
  const pesoInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Modal scanner cámara mobile
  const [scannerAbierto, setScannerAbierto] = useState(false);

  /* ── Derivados ──────────────────────────────────────────── */
  const esMayorista = canal === 'mayorista';
  const metodos = esMayorista ? METODOS_MAYORISTA : METODOS_MINORISTA;

  const clientesCanal = useMemo(() => {
    if (esMayorista) return clientes.filter((c) => c.tipo === 'mayorista' || c.tipo === 'ambos');
    return clientes.filter((c) => c.tipo === 'minorista' || c.tipo === 'ambos' || c.esConsumidorFinal);
  }, [clientes, esMayorista]);

  const productosFiltrados = useMemo(() =>
    productos.filter((p) => {
      const matchBusqueda =
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.codigo ?? '').toLowerCase().includes(busqueda.toLowerCase());
      const matchCategoria = !categoriaFiltro || p.categoriaId === categoriaFiltro;
      return matchBusqueda && matchCategoria;
    }),
    [productos, busqueda, categoriaFiltro],
  );

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId);
  const puedeUsarCC = clienteSeleccionado?.habilitaCuentaCorriente ?? false;
  const descuentoPct = Number(clienteSeleccionado?.descuentoPorcentaje ?? 0);
  const subtotal = cart.reduce((a, i) => a + i.cantidad * i.precioUnitario, 0);
  const descuentoMonto = descuentoPct > 0 ? Math.round(subtotal * descuentoPct) / 100 : 0;
  const total = subtotal - descuentoMonto;

  /* ── Efectos ────────────────────────────────────────────── */
  useEffect(() => {
    if (pesoModal) setTimeout(() => pesoInputRef.current?.focus(), 50);
  }, [pesoModal]);

  /* ── Acciones ───────────────────────────────────────────── */
  function switchCanal(nuevoCanal: CanalVenta) {
    setCanal(nuevoCanal);
    setCart([]);
    setClienteId(nuevoCanal === 'minorista' ? (consumidorFinalId ?? '') : '');
    setTipoPago('contado');
    setMetodoPago(nuevoCanal === 'mayorista' ? 'transferencia' : 'efectivo');
    setBusqueda('');
    setCategoriaFiltro(null);
    setTimeout(() => searchRef.current?.focus(), 100);
  }

  const agregarConCantidad = useCallback((producto: Producto, cantidad: number) => {
    const precio = esMayorista ? Number(producto.precioMayorista) : Number(producto.precioMinorista);
    setCart((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id);
      if (existente) {
        if (producto.tipoUnidad === 'por_unidad') {
          return prev.map((i) =>
            i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + cantidad } : i,
          );
        } else {
          return prev.map((i) =>
            i.producto.id === producto.id ? { ...i, cantidad } : i,
          );
        }
      }
      return [...prev, { producto, cantidad, precioUnitario: precio }];
    });
  }, [esMayorista]);

  function handleClickProducto(p: Producto) {
    if (p.grupoVarianteId) {
      const variantes = productos.filter(
        (prod) => prod.grupoVarianteId === p.grupoVarianteId && prod.activo,
      );
      if (variantes.length > 1) { setVariantesGrupo(variantes); return; }
    }
    abrirProducto(p);
  }

  function abrirProducto(p: Producto) {
    setVariantesGrupo(null);
    if (p.tipoUnidad === 'por_kg') {
      const enCarrito = cart.find((i) => i.producto.id === p.id);
      setPesoModal(p);
      setPesoInput(enCarrito ? String(enCarrito.cantidad) : '');
    } else {
      agregarConCantidad(p, 1);
    }
  }

  function confirmarPeso() {
    if (!pesoModal) return;
    const kg = parseFloat(pesoInput.replace(',', '.'));
    if (!kg || kg <= 0) { toast.error('Ingresá un peso válido'); return; }
    agregarConCantidad(pesoModal, Math.round(kg * 1000) / 1000);
    setPesoModal(null);
    setPesoInput('');
  }

  function cambiarCantidadUnidad(productoId: string, delta: number) {
    setCart((prev) =>
      prev.map((i) => i.producto.id === productoId ? { ...i, cantidad: i.cantidad + delta } : i)
          .filter((i) => i.cantidad > 0),
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
        await crearVenta({
          canal,
          clienteId,
          tipoPago,
          metodoPago: tipoPago === 'contado' ? metodoPago : undefined,
          lineas,
          descuento: descuentoMonto > 0 ? descuentoMonto.toFixed(2) : undefined,
        });
        setCart([]);
        setBusqueda('');
        setClienteId(esMayorista ? '' : (consumidorFinalId ?? ''));
        setTipoPago('contado');
        setMobileView('productos');
        setConfirmado(true);
        toast.success('¡Venta registrada!', { icon: '✓' });
        setTimeout(() => setConfirmado(false), 2500);
        setTimeout(() => searchRef.current?.focus(), 100);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al registrar la venta');
      }
    });
  }

  /* ── Procesar un código escaneado (scanner físico o cámara) ── */
  const procesarScan = useCallback((codigo: string) => {
    const MIN_CODE_LENGTH = 3;
    const trimmed = codigo.trim();
    if (!trimmed || trimmed.length < MIN_CODE_LENGTH) return;
    const encontrado = productos.find(
      (p) => p.activo && p.codigo && p.codigo.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (encontrado) {
      if (encontrado.tipoUnidad === 'por_kg') {
        setPesoModal(encontrado);
        setPesoInput('');
      } else {
        agregarConCantidad(encontrado, 1);
        toast.success(`${encontrado.nombre} agregado`, { duration: 1500, icon: '✓' });
      }
      setBusqueda('');
    } else {
      toast.error(`Código "${trimmed}" no encontrado`, { duration: 3000 });
    }
  }, [productos, agregarConCantidad]);

  /* ── Listener scanner físico (USB / Bluetooth — emite teclado) ── */
  useEffect(() => {
    let buffer = '';
    let bufferTimer: ReturnType<typeof setTimeout> | null = null;
    const BUFFER_TIMEOUT_MS = 80;
    const MIN_CODE_LENGTH = 3;

    function onKeyDown(e: KeyboardEvent) {
      if (pesoModal || scannerAbierto) return;
      const target = e.target as HTMLElement;
      const isFocusedOtherInput =
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) &&
        target.id !== 'pos-busqueda';
      if (isFocusedOtherInput) return;

      if (e.key === 'Enter') {
        if (bufferTimer) clearTimeout(bufferTimer);
        const codigo = buffer;
        buffer = '';
        if (codigo.length >= MIN_CODE_LENGTH) { e.preventDefault(); procesarScan(codigo); }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buffer += e.key;
        if (bufferTimer) clearTimeout(bufferTimer);
        bufferTimer = setTimeout(() => { buffer = ''; }, BUFFER_TIMEOUT_MS);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (bufferTimer) clearTimeout(bufferTimer);
    };
  }, [procesarScan, pesoModal, scannerAbierto]);

  /* ────────────────────────────────────────────────────────────
     RENDER
  ─────────────────────────────────────────────────────────── */
  return (
    <>
      <div className="flex h-[calc(100dvh-3.5rem)] md:h-screen overflow-hidden bg-background">

        {/* ══════════════════════════════════════════════════
            PANEL IZQUIERDO — Productos
        ══════════════════════════════════════════════════ */}
        <div className={cn(
          'flex-1 flex flex-col overflow-hidden',
          mobileView === 'carrito' ? 'hidden md:flex' : 'flex',
        )}>

          {/* ── Header ────────────────────────────────────── */}
          <div className="shrink-0 bg-card border-b border-border px-3 sm:px-4 pt-3 pb-2.5 space-y-2.5">

            {/* Canal switch */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1 p-1 bg-muted/70 rounded-xl flex-1 max-w-xs">
                {(['minorista', 'mayorista'] as CanalVenta[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => switchCanal(c)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150',
                      canal === c
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {c === 'minorista'
                      ? <Store className="h-3.5 w-3.5 shrink-0" />
                      : <Users2 className="h-3.5 w-3.5 shrink-0" />
                    }
                    <span className="capitalize">{c}</span>
                  </button>
                ))}
              </div>

              {/* Items en carrito — shortcut mobile */}
              {cart.length > 0 && (
                <button
                  onClick={() => setMobileView('carrito')}
                  className="md:hidden flex items-center gap-1.5 px-3 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[13px] font-semibold"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  {cart.length}
                  <ChevronRight className="h-3 w-3 opacity-60" />
                </button>
              )}
            </div>

            {/* Barra de búsqueda */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
              <input
                ref={searchRef}
                id="pos-busqueda"
                type="text"
                autoComplete="off"
                autoFocus
                className={cn(
                  'w-full h-11 pl-10 pr-12 sm:pr-28 rounded-xl text-sm',
                  'bg-background border border-border/60',
                  'placeholder:text-muted-foreground/50',
                  'focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10',
                  'transition-all duration-150',
                )}
                placeholder="Buscar producto o escanear código..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {/* Indicador scanner activo — solo desktop */}
              <span className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-1 text-[10px] text-muted-foreground/40 pointer-events-none select-none">
                <ScanBarcode className="h-3.5 w-3.5" />
                <span>scanner activo</span>
              </span>
              {/* Botón cámara — solo mobile */}
              <button
                type="button"
                onClick={() => setScannerAbierto(true)}
                className="sm:hidden absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors active:scale-95"
                aria-label="Escanear con cámara"
                title="Escanear con cámara"
              >
                <ScanBarcode className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            {/* Chips de categoría */}
            {categorias.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                <button
                  onClick={() => setCategoriaFiltro(null)}
                  className={cn(
                    'shrink-0 px-3 h-7 rounded-full text-xs font-medium transition-all duration-150',
                    !categoriaFiltro
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  Todos
                </button>
                {categorias.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaFiltro(categoriaFiltro === cat.id ? null : cat.id)}
                    className={cn(
                      'shrink-0 px-3 h-7 rounded-full text-xs font-medium transition-all duration-150',
                      categoriaFiltro === cat.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {cat.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Grid de productos ─────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {productosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="h-14 w-14 rounded-2xl bg-muted border border-border flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground/70">Sin resultados</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {busqueda ? `No hay productos con "${busqueda}"` : 'No hay productos en esta categoría'}
                  </p>
                </div>
                {busqueda && (
                  <button
                    onClick={() => setBusqueda('')}
                    className="text-xs text-primary underline underline-offset-2"
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-2.5">
                {productosFiltrados.map((p) => {
                  const enCarrito = cart.find((i) => i.producto.id === p.id);
                  const precio = esMayorista ? Number(p.precioMayorista) : Number(p.precioMinorista);
                  return (
                    <ProductCard
                      key={p.id}
                      producto={p}
                      enCarrito={enCarrito}
                      precio={precio}
                      esMayorista={esMayorista}
                      onClick={() => handleClickProducto(p)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            PANEL DERECHO — Carrito
        ══════════════════════════════════════════════════ */}
        <div className={cn(
          'flex-col bg-card border-l border-border w-full md:w-[300px] lg:w-[340px] shrink-0',
          mobileView === 'productos' ? 'hidden md:flex' : 'flex',
        )}>

          {/* ── Header carrito ───────────────────────────── */}
          <div className="shrink-0 h-14 flex items-center gap-2 px-4 border-b border-border">
            <button
              onClick={() => setMobileView('productos')}
              className="md:hidden text-muted-foreground hover:text-foreground transition-colors mr-1"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            <span className="font-semibold text-sm">Carrito</span>
            <AnimatePresence>
              {cart.length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="ml-1 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center"
                >
                  {cart.length}
                </motion.span>
              )}
            </AnimatePresence>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="ml-auto text-[11px] text-muted-foreground hover:text-destructive transition-colors"
              >
                Vaciar
              </button>
            )}
          </div>

          {/* ── Items del carrito ────────────────────────── */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {cart.length === 0 ? (
              <EmptyCart esMayorista={esMayorista} />
            ) : (
              <div className="p-3 space-y-1.5">
                <AnimatePresence initial={false}>
                  {cart.map((item) => {
                    const esKg = item.producto.tipoUnidad === 'por_kg';
                    const colorClass = getColorClass(item.producto.nombre);
                    return (
                      <motion.div
                        key={item.producto.id}
                        layout
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 30, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="group flex items-center gap-2.5 p-2.5 rounded-xl bg-background/60 border border-border/50 hover:border-border transition-colors"
                      >
                        {/* Avatar */}
                        <div className={cn(
                          'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold',
                          colorClass,
                        )}>
                          {esKg
                            ? <Scale className="h-3.5 w-3.5" strokeWidth={1.75} />
                            : item.producto.nombre.charAt(0).toUpperCase()
                          }
                        </div>

                        {/* Nombre + precio unitario */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate leading-tight">
                            {item.producto.nombre}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono tabular-nums">
                            {formatARS(item.precioUnitario)}/{esKg ? 'kg' : 'un'}
                          </p>
                        </div>

                        {/* Controles */}
                        <div className="flex items-center gap-1 shrink-0">
                          {esKg ? (
                            <button
                              onClick={() => {
                                setPesoModal(item.producto);
                                setPesoInput(String(item.cantidad));
                              }}
                              className="text-[12px] font-semibold font-mono text-primary underline underline-offset-2 tabular-nums hover:text-primary/80 transition-colors"
                            >
                              {item.cantidad.toLocaleString('es-AR', { maximumFractionDigits: 3 })} kg
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => cambiarCantidadUnidad(item.producto.id, -1)}
                                className="h-6 w-6 rounded-md border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <motion.span
                                key={item.cantidad}
                                initial={{ scale: 1.3, color: 'oklch(0.70 0.22 43)' }}
                                animate={{ scale: 1, color: 'oklch(0.92 0.004 70)' }}
                                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                className="w-7 text-center text-[13px] font-bold tabular-nums"
                              >
                                {item.cantidad}
                              </motion.span>
                              <button
                                onClick={() => cambiarCantidadUnidad(item.producto.id, 1)}
                                className="h-6 w-6 rounded-md border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Subtotal */}
                        <p className="w-[4.5rem] text-right text-[13px] font-bold font-mono tabular-nums shrink-0">
                          {formatARS(item.cantidad * item.precioUnitario)}
                        </p>

                        {/* Eliminar */}
                        <button
                          onClick={() => eliminarItem(item.producto.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-0.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* ── Panel de cobro ───────────────────────────── */}
          <div className="shrink-0 border-t border-border p-4 space-y-3 bg-card">

            {/* Totales */}
            {descuentoMonto > 0 && (
              <div className="space-y-1 text-[12px]">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">{formatARS(subtotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>Descuento {descuentoPct}%</span>
                  <span className="font-mono tabular-nums">− {formatARS(descuentoMonto)}</span>
                </div>
              </div>
            )}

            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total</span>
              <motion.span
                key={total}
                initial={{ opacity: 0.5, scale: 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                className="text-[26px] font-bold tracking-tight tabular-nums font-mono"
              >
                {formatARS(total)}
              </motion.span>
            </div>

            <div className="h-px bg-border/60" />

            {/* Cliente */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
                Cliente {esMayorista && <span className="text-destructive ml-0.5">*</span>}
              </label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger className="h-9 text-sm bg-background/60 border-border/60 focus:border-primary/50">
                  <SelectValue placeholder="Seleccionar cliente..." />
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
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
                Forma de pago
              </label>
              <div className="flex gap-1 p-1 bg-muted/60 rounded-xl">
                <button
                  onClick={() => setTipoPago('contado')}
                  className={cn(
                    'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
                    tipoPago === 'contado'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Contado
                </button>
                <button
                  onClick={() => puedeUsarCC && setTipoPago('cuenta_corriente')}
                  disabled={!puedeUsarCC}
                  className={cn(
                    'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
                    !puedeUsarCC
                      ? 'opacity-30 cursor-not-allowed'
                      : tipoPago === 'cuenta_corriente'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Cta. cte.
                </button>
              </div>
            </div>

            {/* Método de pago (solo contado) */}
            {tipoPago === 'contado' && (
              <div className="flex gap-1.5 flex-wrap">
                {metodos.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMetodoPago(m.value)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 h-7 rounded-lg border text-xs font-medium transition-all duration-150',
                      metodoPago === m.value
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-border bg-background/40',
                    )}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {/* Botón COBRAR */}
            <button
              onClick={handleConfirmar}
              disabled={isPending || cart.length === 0 || (esMayorista && !clienteId)}
              className={cn(
                'w-full h-14 rounded-xl font-bold text-base tracking-tight transition-all duration-150',
                'flex items-center justify-center gap-2.5',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
                confirmado
                  ? 'bg-success text-white'
                  : 'bg-primary text-primary-foreground glow-primary hover:brightness-105 press-scale',
              )}
            >
              {confirmado ? (
                <>
                  <Check className="h-5 w-5" strokeWidth={2.5} />
                  ¡Venta registrada!
                </>
              ) : isPending ? (
                <span className="opacity-70">Registrando...</span>
              ) : (
                <>
                  Cobrar {cart.length > 0 && formatARS(total)}
                  <ArrowRight className="h-4.5 w-4.5 opacity-70" />
                </>
              )}
            </button>

          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            Botón flotante carrito — solo mobile
        ══════════════════════════════════════════════════ */}
        <AnimatePresence>
          {mobileView === 'productos' && cart.length > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={() => setMobileView('carrito')}
              className="md:hidden fixed bottom-5 left-4 right-4 z-30 h-[3.75rem] flex items-center justify-between px-5 rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_32px_oklch(0.68_0.19_38_/_45%)]"
            >
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="h-5 w-5" strokeWidth={2} />
                <span className="font-bold text-[15px]">Ver carrito</span>
                <span className="h-5 w-5 bg-white/20 rounded-full text-[11px] font-bold flex items-center justify-center">
                  {cart.length}
                </span>
              </div>
              <span className="font-bold text-[17px] tabular-nums font-mono">{formatARS(total)}</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ══════════════════════════════════════════════════════
          Modal: variantes del grupo
      ════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {variantesGrupo && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setVariantesGrupo(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-5 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold">Variantes</h2>
                  <button
                    onClick={() => setVariantesGrupo(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {variantesGrupo.map((p) => {
                    const precio = esMayorista ? Number(p.precioMayorista) : Number(p.precioMinorista);
                    const enCarrito = cart.find((i) => i.producto.id === p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => abrirProducto(p)}
                        className={cn(
                          'w-full text-left p-3.5 rounded-xl border transition-all',
                          enCarrito
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border/60 bg-background/40 hover:border-border hover:bg-muted/30',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">{p.nombre}</p>
                          <p className="text-sm font-bold text-primary tabular-nums font-mono">
                            {formatARS(precio)}/{p.tipoUnidad === 'por_kg' ? 'kg' : 'un'}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-muted-foreground">
                            Stock: {p.tipoUnidad === 'por_kg' ? formatKg(Number(p.stockActual)) : `${p.stockActual} un`}
                          </p>
                          {enCarrito && (
                            <span className="text-xs text-primary font-medium">
                              {p.tipoUnidad === 'por_kg'
                                ? `${enCarrito.cantidad} kg en carrito`
                                : `${enCarrito.cantidad} en carrito`}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════
          Modal: peso para productos por_kg
      ════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {pesoModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => { setPesoModal(null); setPesoInput(''); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Scale className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                        Peso a vender
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold tracking-tight">{pesoModal.nombre}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {formatARS(esMayorista ? Number(pesoModal.precioMayorista) : Number(pesoModal.precioMinorista))}/kg
                      <span className="mx-1.5 text-muted-foreground/40">·</span>
                      Stock: {formatKg(Number(pesoModal.stockActual))}
                    </p>
                  </div>
                  <button
                    onClick={() => { setPesoModal(null); setPesoInput(''); }}
                    className="text-muted-foreground hover:text-foreground transition-colors mt-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Input grande */}
                <div className="relative mb-4">
                  <input
                    ref={pesoInputRef}
                    type="number"
                    step="0.001"
                    min="0.001"
                    placeholder="0.000"
                    value={pesoInput}
                    onChange={(e) => setPesoInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmarPeso();
                      if (e.key === 'Escape') { setPesoModal(null); setPesoInput(''); }
                    }}
                    className="w-full text-5xl font-bold tabular-nums text-center bg-muted/40 border border-border/60 rounded-xl px-4 py-5 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-muted-foreground/50 pointer-events-none">
                    kg
                  </span>
                </div>

                {/* Preview precio */}
                <AnimatePresence>
                  {pesoInput && Number(pesoInput) > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {Number(pesoInput).toLocaleString('es-AR', { maximumFractionDigits: 3 })} kg ×{' '}
                          {formatARS(esMayorista ? Number(pesoModal.precioMayorista) : Number(pesoModal.precioMinorista))}
                        </span>
                        <span className="text-lg font-bold text-primary tabular-nums font-mono">
                          {formatARS(
                            Number(pesoInput) *
                            (esMayorista ? Number(pesoModal.precioMayorista) : Number(pesoModal.precioMinorista)),
                          )}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Botones */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setPesoModal(null); setPesoInput(''); }}
                    className="flex-1 h-11 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarPeso}
                    disabled={!pesoInput || Number(pesoInput) <= 0}
                    className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold glow-primary hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    Agregar al carrito
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground/40 text-center mt-3">
                  Enter para confirmar · Esc para cerrar
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════
          Modal: Scanner cámara (mobile)
      ════════════════════════════════════════════════════ */}
      <BarcodeScannerModal
        open={scannerAbierto}
        onClose={() => setScannerAbierto(false)}
        onDetected={(codigo) => {
          setScannerAbierto(false);
          procesarScan(codigo);
        }}
      />
    </>
  );
}
