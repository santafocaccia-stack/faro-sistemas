'use client';

import { useState, useTransition, useMemo, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Check,
  Package, ScanBarcode, ChevronLeft, Scale, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { crearVenta, type LineaVenta } from '@/server/actions/ventas';
import { formatARS, formatKg } from '@/lib/utils';
import type { Producto, Cliente, MetodoPago, CanalVenta, Categoria } from '@/server/db/schema';

type CartItem = {
  producto: Producto;
  cantidad: number;   // kg con decimales para por_kg, entero para por_unidad
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
  categorias: Categoria[];
};

export function PosVenta({ productos, clientes, consumidorFinalId, categorias }: Props) {
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

  // Modal para ingresar peso de productos por_kg
  const [pesoModal, setPesoModal] = useState<Producto | null>(null);
  const [pesoInput, setPesoInput] = useState('');
  const pesoInputRef = useRef<HTMLInputElement>(null);

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
    }), [productos, busqueda, categoriaFiltro]);

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId);
  const puedeUsarCC = clienteSeleccionado?.habilitaCuentaCorriente ?? false;
  const descuentoPct = Number(clienteSeleccionado?.descuentoPorcentaje ?? 0);
  const subtotal = cart.reduce((a, i) => a + i.cantidad * i.precioUnitario, 0);
  const descuentoMonto = descuentoPct > 0 ? Math.round(subtotal * descuentoPct) / 100 : 0;
  const total = subtotal - descuentoMonto;

  // Foco automático en el input de peso cuando se abre el modal
  useEffect(() => {
    if (pesoModal) {
      setTimeout(() => pesoInputRef.current?.focus(), 50);
    }
  }, [pesoModal]);

  function switchCanal(nuevoCanal: CanalVenta) {
    setCanal(nuevoCanal);
    setCart([]);
    setClienteId(nuevoCanal === 'minorista' ? (consumidorFinalId ?? '') : '');
    setTipoPago('contado');
    setMetodoPago(nuevoCanal === 'mayorista' ? 'transferencia' : 'efectivo');
  }

  // Agrega con cantidad específica (kg decimales o unidades enteras)
  const agregarConCantidad = useCallback((producto: Producto, cantidad: number) => {
    const precio = esMayorista ? Number(producto.precioMayorista) : Number(producto.precioMinorista);
    setCart((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id);
      if (existente) {
        if (producto.tipoUnidad === 'por_unidad') {
          // Unidades: sumar
          return prev.map((i) =>
            i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + cantidad } : i
          );
        } else {
          // Kg: reemplazar con nuevo peso
          return prev.map((i) =>
            i.producto.id === producto.id ? { ...i, cantidad: cantidad } : i
          );
        }
      }
      return [...prev, { producto, cantidad, precioUnitario: precio }];
    });
  }, [esMayorista]);

  // Click en producto del grid — si tiene grupo de variantes, mostrar panel lateral
  function handleClickProducto(p: Producto) {
    if (p.grupoVarianteId) {
      const variantes = productos.filter(
        (prod) => prod.grupoVarianteId === p.grupoVarianteId && prod.activo
      );
      if (variantes.length > 1) {
        setVariantesGrupo(variantes);
        return;
      }
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

  // Confirmar peso del modal
  function confirmarPeso() {
    if (!pesoModal) return;
    const kg = parseFloat(pesoInput.replace(',', '.'));
    if (!kg || kg <= 0) { toast.error('Ingresá un peso válido'); return; }
    agregarConCantidad(pesoModal, Math.round(kg * 1000) / 1000);
    setPesoModal(null);
    setPesoInput('');
  }

  // ── Listener de lector de código de barras ───────────────────────────────
  useEffect(() => {
    let buffer = '';
    let bufferTimer: ReturnType<typeof setTimeout> | null = null;
    const BUFFER_TIMEOUT_MS = 80;
    const MIN_CODE_LENGTH = 3;

    function procesarScan(codigo: string) {
      const trimmed = codigo.trim();
      if (!trimmed || trimmed.length < MIN_CODE_LENGTH) return;
      const encontrado = productos.find(
        (p) => p.activo && p.codigo && p.codigo.trim().toLowerCase() === trimmed.toLowerCase()
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
        toast.error(`Código "${trimmed}" no encontrado`, {
          description: 'Verificá que el producto tenga el código registrado.',
          duration: 3000,
        });
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (pesoModal) return; // No interferir si el modal está abierto
      const target = e.target as HTMLElement;
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
        if (bufferTimer) clearTimeout(bufferTimer);
        bufferTimer = setTimeout(() => { buffer = ''; }, BUFFER_TIMEOUT_MS);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (bufferTimer) clearTimeout(bufferTimer);
    };
  }, [productos, agregarConCantidad, pesoModal]);

  function cambiarCantidadUnidad(productoId: string, delta: number) {
    setCart((prev) =>
      prev.map((i) => i.producto.id === productoId ? { ...i, cantidad: i.cantidad + delta } : i)
          .filter((i) => i.cantidad > 0)
    );
  }

  function editarPesoEnCarrito(productoId: string, valor: string) {
    const kg = parseFloat(valor.replace(',', '.'));
    if (isNaN(kg) || kg < 0) return;
    if (kg === 0) {
      setCart((prev) => prev.filter((i) => i.producto.id !== productoId));
    } else {
      setCart((prev) =>
        prev.map((i) =>
          i.producto.id === productoId ? { ...i, cantidad: Math.round(kg * 1000) / 1000 } : i
        )
      );
    }
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
      <div className="flex h-[calc(100dvh-3.5rem)] md:h-screen overflow-hidden">

        {/* ── Panel izquierdo: productos ── */}
        <div className={`flex-1 flex-col border-r overflow-hidden ${mobileView === 'carrito' ? 'hidden md:flex' : 'flex'}`}>

          {/* Header con canal + búsqueda + categorías */}
          <div className="p-4 border-b bg-card/50 space-y-3">
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

            {/* Chips de categoría */}
            {categorias.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setCategoriaFiltro(null)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    !categoriaFiltro
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Todos
                </button>
                {categorias.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaFiltro(categoriaFiltro === cat.id ? null : cat.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      categoriaFiltro === cat.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {cat.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grid de productos */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4">
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
                  const esKg = p.tipoUnidad === 'por_kg';
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleClickProducto(p)}
                      className={`relative text-left p-3 rounded-xl border transition-all duration-150 ${
                        enCarrito
                          ? 'border-primary/40 bg-primary/5 shadow-[0_0_0_1px_oklch(0.78_0.16_52_/_20%)]'
                          : 'border-border/60 bg-card hover:border-border hover:bg-card/80'
                      }`}
                    >
                      {/* Badge: kg o cantidad */}
                      {enCarrito && (
                        <span className="absolute top-2 right-2 h-auto min-w-5 px-1 bg-primary text-primary-foreground rounded-full text-[10px] flex items-center justify-center font-bold leading-5">
                          {esKg ? `${enCarrito.cantidad.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} kg` : enCarrito.cantidad}
                        </span>
                      )}
                      <p className="font-medium text-sm leading-snug pr-8">{p.nombre}</p>
                      <p className="text-sm font-semibold text-primary mt-2">
                        {formatARS(precio)}
                        <span className="text-[11px] font-normal text-muted-foreground">
                          /{esKg ? 'kg' : 'un'}
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        {esKg
                          ? <><Scale className="h-3 w-3" />{formatKg(Number(p.stockActual))}</>
                          : `${p.stockActual} un`
                        }
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Panel derecho: carrito ── */}
        <div className={`flex-col bg-card border-l w-full md:w-80 lg:w-96 ${mobileView === 'productos' ? 'hidden md:flex' : 'flex'}`}>

          <div className="h-14 flex items-center gap-2 px-4 border-b shrink-0">
            <button
              onClick={() => setMobileView('productos')}
              className="md:hidden mr-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
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
                {cart.map((item) => {
                  const esKg = item.producto.tipoUnidad === 'por_kg';
                  return (
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
                        <p className="text-xs text-muted-foreground">
                          {formatARS(item.precioUnitario)}/{esKg ? 'kg' : 'un'}
                        </p>
                      </div>

                      {/* Controles de cantidad */}
                      <div className="flex items-center gap-1 shrink-0">
                        {esKg ? (
                          // Kg: input editable + click para abrir modal de peso
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.001"
                              min="0.001"
                              value={item.cantidad}
                              onChange={(e) => editarPesoEnCarrito(item.producto.id, e.target.value)}
                              onClick={() => {
                                setPesoModal(item.producto);
                                setPesoInput(String(item.cantidad));
                              }}
                              readOnly
                              className="w-16 text-right text-sm font-semibold tabular-nums bg-muted/60 border border-border/40 rounded-md px-2 py-1 cursor-pointer hover:border-primary/40 transition-colors"
                            />
                            <span className="text-xs text-muted-foreground">kg</span>
                          </div>
                        ) : (
                          // Unidades: +/-
                          <>
                            <button
                              onClick={() => cambiarCantidadUnidad(item.producto.id, -1)}
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
                              onClick={() => cambiarCantidadUnidad(item.producto.id, 1)}
                              className="h-6 w-6 rounded-md border border-border/60 flex items-center justify-center hover:bg-muted transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </>
                        )}
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
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {/* Panel de cobro */}
          <div className="border-t p-4 space-y-3 bg-card">
            {descuentoMonto > 0 && (
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Subtotal</span>
                  <span className="text-sm tabular-nums text-muted-foreground">{formatARS(subtotal)}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-emerald-400">Descuento {descuentoPct}%</span>
                  <span className="text-sm tabular-nums text-emerald-400">− {formatARS(descuentoMonto)}</span>
                </div>
              </div>
            )}
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <motion.span
                key={total}
                initial={{ opacity: 0.6, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                className="text-2xl font-bold tracking-tight tabular-nums"
              >
                {formatARS(total)}
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

            <Button
              className="w-full h-11 font-semibold text-sm shadow-[0_0_20px_oklch(0.78_0.16_52_/_25%)] transition-all"
              onClick={handleConfirmar}
              disabled={isPending || cart.length === 0 || (esMayorista && !clienteId)}
            >
              {confirmado ? (
                <span className="flex items-center gap-2"><Check className="h-4 w-4" /> Venta registrada</span>
              ) : isPending ? 'Registrando...' : `Cobrar ${formatARS(total)}`}
            </Button>
          </div>
        </div>

        {/* ── Botón flotante carrito (solo mobile) ── */}
        <AnimatePresence>
          {mobileView === 'productos' && cart.length > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={() => setMobileView('carrito')}
              className="md:hidden fixed bottom-6 left-4 right-4 z-30 h-14 flex items-center justify-between px-5 rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_32px_oklch(0.68_0.19_38_/_40%)]"
            >
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="h-5 w-5" />
                <span className="font-semibold text-sm">Ver carrito</span>
                <span className="h-5 w-5 bg-primary-foreground/20 rounded-full text-[11px] font-bold flex items-center justify-center">
                  {cart.length}
                </span>
              </div>
              <span className="font-bold text-base tabular-nums">{formatARS(total)}</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Panel de variantes del grupo ─────────────────────────────────── */}
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
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-5 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold">
                    {variantesGrupo[0]?.grupoVarianteId ? 'Variantes del grupo' : 'Productos relacionados'}
                  </h2>
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
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          enCarrito
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border/60 bg-background/40 hover:border-border hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{p.nombre}</p>
                          <p className="text-sm font-semibold text-primary tabular-nums">
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

      {/* ── Modal de peso para productos por_kg ─────────────────────────── */}
      <AnimatePresence>
        {pesoModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => { setPesoModal(null); setPesoInput(''); }}
            />

            {/* Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
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
                      <span className="ml-2 text-muted-foreground/50">·</span>
                      <span className="ml-2">Stock: {formatKg(Number(pesoModal.stockActual))}</span>
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
                    className="w-full text-4xl font-bold tabular-nums text-center bg-muted/40 border border-border/60 rounded-xl px-4 py-5 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground/60">
                    kg
                  </span>
                </div>

                {/* Preview precio */}
                {pesoInput && Number(pesoInput) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-4 rounded-lg bg-primary/5 border border-primary/15 px-4 py-2.5 flex items-center justify-between"
                  >
                    <span className="text-sm text-muted-foreground">
                      {Number(pesoInput).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} kg × {formatARS(esMayorista ? Number(pesoModal.precioMayorista) : Number(pesoModal.precioMinorista))}
                    </span>
                    <span className="text-base font-bold text-primary tabular-nums">
                      {formatARS(
                        Number(pesoInput) *
                        (esMayorista ? Number(pesoModal.precioMayorista) : Number(pesoModal.precioMinorista))
                      )}
                    </span>
                  </motion.div>
                )}

                {/* Botones */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setPesoModal(null); setPesoInput(''); }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 glow-primary"
                    onClick={confirmarPeso}
                    disabled={!pesoInput || Number(pesoInput) <= 0}
                  >
                    Agregar al carrito
                  </Button>
                </div>

                <p className="text-[11px] text-muted-foreground/50 text-center mt-3">
                  Enter para confirmar · Esc para cerrar
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
