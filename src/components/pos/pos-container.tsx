'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Search, ScanLine, Store, Users2, ShoppingCart,
  Plus, Minus, Trash2, User, Volume2, VolumeX,
  ChevronDown, X,
} from 'lucide-react';
import { usePosCart, selectTotal, selectCantidadItems, type LineaCart } from '@/lib/stores/pos-cart';
import { parseEtiquetaBalanza } from '@/lib/balanza';
import { crearVenta, type LineaVenta } from '@/server/actions/ventas';
import { formatARS, cn } from '@/lib/utils';
import { beep, beepError, vibrar, sonidoHabilitado, setSonidoHabilitado } from '@/lib/feedback';
import { PosScanner } from '@/components/pos/pos-scanner';
import { PosModalCobrar } from '@/components/pos/pos-modal-cobrar';
import { PosModalLineaSuelta } from '@/components/pos/pos-modal-linea-suelta';
import { PostVentaModal, type VentaCompletada } from '@/components/pos/pos-modal-post-venta';
import { PosModalSinStock, type ConfirmacionSinStock } from '@/components/pos/pos-modal-sin-stock';
import type { Producto, Cliente, Categoria } from '@/server/db/schema';

type Props = {
  productos: Producto[];
  clientes: Cliente[];
  categorias: Categoria[];
  consumidorFinalId: string | null;
  plan?: string;
  negocio: {
    nombre: string;
    cuit: string | null;
    direccion: string | null;
    telefono: string | null;
  };
};

/**
 * POS principal — layout flex determinístico mobile-first.
 *
 * Estructura del DOM (de arriba abajo):
 *   ┌─ Header sticky (canal + cliente + búsqueda)         shrink-0
 *   ├─ Cuerpo (flex-col, flex-1, min-h-0)
 *   │    ├─ Lista de carrito (flex-1 cuando no escaneo,
 *   │    │                    flex-[58] cuando escaneo)
 *   │    │  overflow-y-auto + min-h-0  ← KEY para scroll correcto
 *   │    └─ Cámara (flex-[42], relative, sólo si modoEscaneo)
 *   └─ Footer sticky (total + COBRAR)                     shrink-0
 *
 * Decisiones técnicas clave:
 *  - min-h-0 en la lista: permite que el overflow-y-auto se active dentro
 *    de un flex container (sin esto, el child crece infinito y rompe el layout).
 *  - Sin AnimatePresence en la cámara: animaciones de altura sobre childs
 *    con altura propia crean inconsistencias temporales. Snap directo.
 *  - flex ratios (58/42) en vez de h-Xvh: el layout se autoajusta a la
 *    altura real del contenedor sin depender del viewport.
 */
export function PosContainer({ productos, clientes, categorias, consumidorFinalId, plan, negocio }: Props) {
  // ── Store del carrito ────────────────────────────────────────
  const items = usePosCart((s) => s.items);
  const canal = usePosCart((s) => s.canal);
  const clienteId = usePosCart((s) => s.clienteId);
  const modoEscaneo = usePosCart((s) => s.modoEscaneo);
  const ultimaLineaId = usePosCart((s) => s.ultimaLineaId);
  const total = usePosCart(selectTotal);
  const cantidadItems = usePosCart(selectCantidadItems);

  const setCanal = usePosCart((s) => s.setCanal);
  const setClienteId = usePosCart((s) => s.setClienteId);
  const setModoEscaneo = usePosCart((s) => s.setModoEscaneo);
  const agregarProducto = usePosCart((s) => s.agregarProducto);
  const agregarLineaSuelta = usePosCart((s) => s.agregarLineaSuelta);
  const cambiarCantidad = usePosCart((s) => s.cambiarCantidad);
  const quitar = usePosCart((s) => s.quitar);
  const vaciar = usePosCart((s) => s.vaciar);
  const recalcularPrecios = usePosCart((s) => s.recalcularPrecios);

  // ── Estado UI local ──────────────────────────────────────────
  const [busqueda, setBusqueda] = useState('');
  const [busquedaFocused, setBusquedaFocused] = useState(false);
  const [categoriaFiltroPos, setCategoriaFiltroPos] = useState<string | null>(null);
  const [modalCobrar, setModalCobrar] = useState(false);
  const [modalLineaSuelta, setModalLineaSuelta] = useState(false);
  const [ventaCompletada, setVentaCompletada] = useState<VentaCompletada | null>(null);
  const [confirmSinStock, setConfirmSinStock] = useState<ConfirmacionSinStock | null>(null);
  const [sonido, setSonido] = useState(true);
  // Key del scanner — cambia después de cada venta para forzar un
  // reinicio limpio de la cámara (evita que quede congelada al volver
  // de los modales de cobro).
  const [scannerKey, setScannerKey] = useState(0);
  const [isPending, startTransition] = useTransition();
  const enviandoRef = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  // Cliente por defecto = CF
  useEffect(() => {
    if (clienteId === null && consumidorFinalId) {
      setClienteId(consumidorFinalId);
    }
  }, [clienteId, consumidorFinalId, setClienteId]);

  // Sincronizar setting de sonido al montar
  useEffect(() => {
    setSonido(sonidoHabilitado());
  }, []);

  // Auto-scroll al tope cuando se agrega un item nuevo (con cámara activa)
  useEffect(() => {
    if (modoEscaneo && listaRef.current) {
      listaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [ultimaLineaId, modoEscaneo]);

  // ── Derivados ────────────────────────────────────────────────
  const esMayorista = canal === 'mayorista';
  const clienteSeleccionado = clientes.find((c) => c.id === clienteId);

  const productosActivos = useMemo(
    () => productos.filter((p) => p.activo),
    [productos],
  );

  /** Mapa { categoriaId → nombre } */
  const mapaCategorias = useMemo(() => {
    const m = new Map<string, string>();
    categorias.forEach((c) => m.set(c.id, c.nombre));
    return m;
  }, [categorias]);

  /** Categorías que tienen al menos un producto activo */
  const categoriasConProductos = useMemo(() => {
    const usadas = new Set(productosActivos.map((p) => p.categoriaId).filter(Boolean));
    return categorias.filter((c) => usadas.has(c.id));
  }, [categorias, productosActivos]);

  /** Mapa { productoId → { minorista, mayorista } } para lookup rápido al cambiar canal */
  const mapaPrecios = useMemo(() => {
    const m = new Map<string, { minorista: number; mayorista: number }>();
    productosActivos.forEach((p) => {
      m.set(p.id, {
        minorista: Number(p.precioMinorista),
        mayorista: Number(p.precioMayorista),
      });
    });
    return m;
  }, [productosActivos]);

  /** Cambiar canal + recalcular precios de items ya cargados */
  function cambiarCanal(nuevoCanal: 'minorista' | 'mayorista') {
    if (nuevoCanal === canal) return;
    setCanal(nuevoCanal);
    if (items.length > 0) {
      const cambios = recalcularPrecios(nuevoCanal, mapaPrecios);
      if (cambios > 0) {
        toast.success(
          `Precios actualizados a ${nuevoCanal === 'mayorista' ? 'mayorista' : 'minorista'}`,
          { duration: 1800 },
        );
      }
    }
  }

  const resultadosBusqueda = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    // Sin texto ni categoría → no hay resultados que mostrar
    if (!q && !categoriaFiltroPos) return [] as Producto[];
    let lista = productosActivos;
    if (categoriaFiltroPos) {
      lista = lista.filter((p) => p.categoriaId === categoriaFiltroPos);
    }
    if (q) {
      lista = lista.filter((p) => {
        const matchNombre = p.nombre.toLowerCase().includes(q);
        const matchCodigo = p.codigo?.toLowerCase().includes(q);
        const matchPlu = p.codigoPlu?.toLowerCase().includes(q);
        return matchNombre || matchCodigo || matchPlu;
      });
    }
    return lista.slice(0, 20);
  }, [productosActivos, busqueda, categoriaFiltroPos]);

  /** ¿Mostrar el panel de búsqueda? (chips + dropdown) */
  const panelBusquedaVisible = busquedaFocused || busqueda.trim() !== '' || categoriaFiltroPos !== null;

  /**
   * Agrega un producto al carrito con chequeo de stock.
   * Stock efectivo = stockActual del producto − lo que ya hay en el carrito.
   * Si es <= 0, abre el modal de confirmación "sin stock" en vez de agregar.
   */
  function agregarConChequeoStock(p: Producto) {
    const precio = Number(esMayorista ? p.precioMayorista : p.precioMinorista);
    const enCarrito = items
      .filter((it) => it.productoId === p.id)
      .reduce((acc, it) => acc + it.cantidad, 0);
    const stockActual = Number(p.stockActual);
    const stockEfectivo = stockActual - enCarrito;

    const agregar = () => {
      agregarProducto({ productoId: p.id, nombre: p.nombre, precio, cantidad: 1 });
      beep();
      vibrar(40);
    };

    if (stockEfectivo <= 0) {
      beepError();
      setConfirmSinStock({
        nombre: p.nombre,
        stockActual,
        onAgregar: agregar,
      });
      return;
    }
    agregar();
  }

  /** Agrega un producto por peso (kg) — p. ej. desde una etiqueta de balanza. */
  function agregarPorPeso(p: Producto, kg: number) {
    const precio = Number(esMayorista ? p.precioMayorista : p.precioMinorista);
    agregarProducto({ productoId: p.id, nombre: p.nombre, precio, cantidad: kg });
    beep();
    vibrar(40);
    toast.success(`${p.nombre} · ${kg.toFixed(3).replace('.', ',')} kg`, { duration: 1800 });
  }

  // ── Manejo de código escaneado o tecleado ────────────────────
  function manejarCodigo(codigo: string) {
    const trimmed = codigo.trim();
    if (!trimmed) return;
    // Si hay un modal de confirmación abierto, ignorar escaneos
    if (confirmSinStock) return;

    // Etiqueta de balanza con peso embebido (EAN-13 prefijo 2) → buscar por PLU
    const etiqueta = parseEtiquetaBalanza(trimmed);
    if (etiqueta) {
      const prod = productosActivos.find(
        (p) => p.codigoPlu && String(parseInt(p.codigoPlu, 10)) === etiqueta.plu,
      );
      if (prod) {
        agregarPorPeso(prod, etiqueta.kg);
      } else {
        beepError();
        toast.error(`PLU ${etiqueta.plu} no encontrado`, { duration: 2200 });
      }
      return;
    }

    const encontrado = productosActivos.find(
      (p) =>
        (p.codigo && p.codigo.trim().toLowerCase() === trimmed.toLowerCase()) ||
        (p.codigoPlu && p.codigoPlu.trim().toLowerCase() === trimmed.toLowerCase()),
    );
    if (encontrado) {
      agregarConChequeoStock(encontrado);
    } else {
      beepError();
      toast.error(`Código "${trimmed}" no encontrado`, { duration: 2200 });
    }
  }

  function agregarDesdeResultado(p: Producto) {
    agregarConChequeoStock(p);
    setBusqueda('');
    searchRef.current?.focus();
  }

  // ── Scanner físico (USB/Bluetooth — solo desktop) ────────────
  useEffect(() => {
    let buffer = '';
    let bufferTimer: ReturnType<typeof setTimeout> | null = null;
    const TIMEOUT = 80;
    const MIN_LEN = 3;

    function onKey(e: KeyboardEvent) {
      if (modoEscaneo) return;
      if (modalCobrar || modalLineaSuelta) return;
      const target = e.target as HTMLElement;
      const enInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      const enBusqueda = target.id === 'pos-busqueda';
      if (enInput && !enBusqueda) return;

      if (e.key === 'Enter') {
        if (bufferTimer) clearTimeout(bufferTimer);
        const codigo = buffer;
        buffer = '';
        if (codigo.length >= MIN_LEN) {
          e.preventDefault();
          manejarCodigo(codigo);
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buffer += e.key;
        if (bufferTimer) clearTimeout(bufferTimer);
        bufferTimer = setTimeout(() => { buffer = ''; }, TIMEOUT);
      }
    }

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (bufferTimer) clearTimeout(bufferTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productosActivos, esMayorista, modoEscaneo, modalCobrar, modalLineaSuelta, items, confirmSinStock]);

  // ── Atajos de teclado del POS ────────────────────────────────
  // F2 → abrir COBRAR · Escape → cerrar modal/limpiar búsqueda
  // Supr → quitar el último ítem agregado (solo fuera de inputs)
  useEffect(() => {
    function onShortcut(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const enInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

      // Escape: cierra modales en cascada; si no hay modal, limpia búsqueda
      if (e.key === 'Escape') {
        if (modalCobrar)       { setModalCobrar(false);       return; }
        if (modalLineaSuelta)  { setModalLineaSuelta(false);  return; }
        if (confirmSinStock)   { setConfirmSinStock(null);    return; }
        if (ventaCompletada)   return; // post-venta lo maneja su propio botón
        if (busqueda)          { setBusqueda('');             return; }
        return;
      }

      // No activar F2/Supr si hay un modal abierto
      if (modalCobrar || modalLineaSuelta || confirmSinStock || ventaCompletada) return;

      // F2 → abrir cobrar (funciona incluso dentro de inputs)
      if (e.key === 'F2') {
        e.preventDefault();
        if (items.length > 0 && !isPending) setModalCobrar(true);
        return;
      }

      // Supr → quitar último ítem (solo si no estás escribiendo)
      if (e.key === 'Delete' && !enInput && items.length > 0) {
        e.preventDefault();
        const idAQuitar = ultimaLineaId ?? items[items.length - 1]?.id;
        if (idAQuitar) { quitar(idAQuitar); vibrar(20); }
      }
    }

    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalCobrar, modalLineaSuelta, confirmSinStock, ventaCompletada, busqueda, items, ultimaLineaId, isPending]);

  // ── Cobrar ────────────────────────────────────────────────────
  async function handleCobrar(payload: {
    tipoPago: 'contado' | 'cuenta_corriente';
    metodoPago?: string;
    descuento?: string;
    notas?: string;
  }) {
    if (enviandoRef.current) return;
    if (items.length === 0) { toast.error('El carrito está vacío'); return; }
    if (!clienteId) { toast.error('Falta seleccionar cliente'); return; }

    enviandoRef.current = true;

    const lineas: LineaVenta[] = items.map((it) => ({
      productoId: it.productoId,
      descripcion: it.nombre,
      cantidad: String(it.cantidad),
      precioUnitario: String(it.precio),
      subtotal: String(it.precio * it.cantidad),
    }));

    // Snapshot del carrito antes de vaciar — usado por el modal post-venta
    const lineasSnapshot = items.map((it) => ({
      descripcion: it.nombre,
      cantidad: it.cantidad,
      precioUnitario: it.precio,
      subtotal: it.precio * it.cantidad,
    }));
    const totalSnapshot = total - Number(payload.descuento ?? 0);

    // Mostrar ticket inmediatamente con los datos que ya tenemos en cliente.
    // El número de ticket (asignado por el servidor) se completa en background.
    const ticketBase: VentaCompletada = {
      id: '',
      numero: 0,
      total: totalSnapshot,
      canal,
      clienteNombre: clienteSeleccionado?.razonSocial ?? 'Consumidor final',
      metodoPago: payload.tipoPago === 'contado' ? payload.metodoPago : 'cuenta corriente',
      fecha: new Date(),
      lineas: lineasSnapshot,
      negocio,
      procesando: true,
    };
    setModalCobrar(false);
    setVentaCompletada(ticketBase);

    startTransition(async () => {
      try {
        const result = await crearVenta({
          canal,
          clienteId,
          tipoPago: payload.tipoPago,
          metodoPago: payload.tipoPago === 'contado'
            ? (payload.metodoPago as 'efectivo' | 'transferencia' | 'tarjeta_debito' | 'tarjeta_credito' | 'mercado_pago')
            : undefined,
          lineas,
          descuento: payload.descuento,
          notas: payload.notas,
        });

        beep({ frecuencia: 1320, duracion: 0.1 });
        setTimeout(() => beep({ frecuencia: 1760, duracion: 0.12 }), 100);

        // Completar con número e id reales
        setVentaCompletada((prev) =>
          prev ? { ...prev, id: result.id, numero: result.numero, procesando: false } : null,
        );
      } catch (err) {
        beepError();
        // Si falla, cerrar ticket y volver al modal de cobro con el error
        setVentaCompletada(null);
        setModalCobrar(true);
        toast.error(err instanceof Error ? err.message : 'Error al cobrar');
      } finally {
        enviandoRef.current = false;
      }
    });
  }

  /** Cerrar modal post-venta y limpiar carrito para próxima venta */
  function handleSeguirVendiendo() {
    setVentaCompletada(null);
    vaciar();
    // Reiniciar el scanner para que la cámara quede fresca y lista
    setScannerKey((k) => k + 1);
    searchRef.current?.focus();
  }

  function toggleSonido() {
    const nuevo = !sonido;
    setSonido(nuevo);
    setSonidoHabilitado(nuevo);
    if (nuevo) beep();
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="screen-only flex flex-col h-full bg-background">

      {/* ═══════════════════════════════════════════════════════
          HEADER STICKY — canal + cliente + búsqueda
         ═══════════════════════════════════════════════════════ */}
      <header className="shrink-0 border-b border-border/60 bg-card/90 backdrop-blur-md relative z-30">
        <div className="px-3 sm:px-5 pt-3 pb-2.5 space-y-2.5 max-w-3xl mx-auto w-full">

          {/* Canal + toggle sonido */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1 p-1 bg-muted/70 rounded-xl flex-1">
              {(['minorista', 'mayorista'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => cambiarCanal(c)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150',
                    canal === c
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {c === 'minorista' ? <Store className="h-3.5 w-3.5" /> : <Users2 className="h-3.5 w-3.5" />}
                  {c === 'minorista' ? 'Minorista' : 'Mayorista'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={toggleSonido}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-muted/70 text-muted-foreground hover:text-foreground transition-colors active:scale-95"
              aria-label={sonido ? 'Desactivar sonido' : 'Activar sonido'}
              title={sonido ? 'Sonido activado' : 'Sonido desactivado'}
            >
              {sonido ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </div>

          {/* Cliente actual */}
          <ClienteSelector
            clientes={clientes}
            clienteId={clienteId}
            onChange={setClienteId}
            esMayorista={esMayorista}
          />

          {/* Búsqueda + toggle cámara */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
            <input
              ref={searchRef}
              id="pos-busqueda"
              type="text"
              autoComplete="off"
              className="w-full h-11 pl-10 pr-12 rounded-xl text-sm bg-background border border-border/60 placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
              placeholder={modoEscaneo ? 'O buscá manualmente...' : 'Buscar producto o escanear código...'}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onFocus={() => setBusquedaFocused(true)}
              onBlur={() => setTimeout(() => setBusquedaFocused(false), 150)}
            />
            {/* Botón cámara — solo mobile */}
            <button
              type="button"
              onClick={() => setModoEscaneo(!modoEscaneo)}
              className={cn(
                'sm:hidden absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-lg transition-all active:scale-95',
                modoEscaneo
                  ? 'bg-primary text-primary-foreground shadow-[0_0_0_2px_oklch(var(--primary)_/_0.3)]'
                  : 'bg-primary/10 text-primary hover:bg-primary/20',
              )}
              aria-label={modoEscaneo ? 'Cerrar cámara' : 'Abrir cámara'}
            >
              <ScanLine className="h-4 w-4" />
            </button>
            {/* Indicador desktop scanner USB */}
            <span className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-1 text-[10px] text-muted-foreground/50 pointer-events-none select-none">
              <ScanLine className="h-3.5 w-3.5" />
              <span>scanner USB</span>
            </span>

            {/* Panel de búsqueda — chips de categoría + resultados */}
            <AnimatePresence>
              {panelBusquedaVisible && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-40 flex flex-col max-h-[55vh]"
                  // Evita que el input pierda foco al tocar dentro del panel
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {/* Chips de categoría */}
                  {categoriasConProductos.length > 0 && (
                    <div className="shrink-0 flex gap-1.5 overflow-x-auto no-scrollbar px-2.5 py-2 border-b border-border/50">
                      <button
                        type="button"
                        onClick={() => setCategoriaFiltroPos(null)}
                        className={cn(
                          'shrink-0 px-2.5 h-7 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap',
                          categoriaFiltroPos === null
                            ? 'bg-foreground text-background'
                            : 'bg-muted/60 text-muted-foreground hover:text-foreground',
                        )}
                      >
                        Todas
                      </button>
                      {categoriasConProductos.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCategoriaFiltroPos(categoriaFiltroPos === c.id ? null : c.id)}
                          className={cn(
                            'shrink-0 px-2.5 h-7 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap',
                            categoriaFiltroPos === c.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted/60 text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {c.nombre}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Resultados */}
                  <div className="overflow-y-auto">
                    {resultadosBusqueda.length > 0 ? (
                      resultadosBusqueda.map((p) => {
                        const precio = Number(esMayorista ? p.precioMayorista : p.precioMinorista);
                        const catNombre = p.categoriaId ? mapaCategorias.get(p.categoriaId) : null;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => agregarDesdeResultado(p)}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-muted/50 transition-colors border-b border-border/40 last:border-b-0"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-medium truncate">{p.nombre}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {p.codigo && (
                                  <span className="text-[10px] text-muted-foreground/60 font-mono">{p.codigo}</span>
                                )}
                                {p.codigoPlu && (
                                  <span className="text-[10px] text-primary/70 font-mono">PLU {p.codigoPlu}</span>
                                )}
                                {catNombre && (
                                  <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary/80 leading-none">
                                    {catNombre}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="font-mono tabular-nums text-[13px] font-semibold ml-3">
                              {formatARS(precio)}
                            </p>
                          </button>
                        );
                      })
                    ) : busqueda.trim() ? (
                      <div className="p-3">
                        <p className="text-xs text-muted-foreground text-center">
                          Sin resultados para &quot;{busqueda}&quot;
                        </p>
                        <button
                          type="button"
                          onClick={() => { setModalLineaSuelta(true); setBusqueda(''); }}
                          className="w-full mt-2 px-3 h-8 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          + Agregar como línea suelta
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          {categoriaFiltroPos
                            ? 'No hay productos en esta categoría'
                            : 'Escribí para buscar o elegí una categoría'}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════
          CUERPO — lista + cámara (split cuando modoEscaneo)
         ═══════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-0 max-w-3xl mx-auto w-full">

        {/* Lista del carrito — scrollable
            min-h-0 es CRÍTICO: sin esto el child crecería sin límite y
            el overflow-y-auto no funcionaría dentro del flex container. */}
        <div
          ref={listaRef}
          className={cn(
            'overflow-y-auto px-3 sm:px-5 py-3 min-h-0',
            modoEscaneo ? 'flex-[58]' : 'flex-1',
          )}
        >
          {items.length === 0 ? (
            <EmptyState modoEscaneo={modoEscaneo} />
          ) : (
            <motion.ul layout className="space-y-2">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <CarritoItem
                    key={item.id}
                    item={item}
                    esUltimo={item.id === ultimaLineaId}
                    onMas={() => cambiarCantidad(item.id, item.cantidad + 1)}
                    onMenos={() => cambiarCantidad(item.id, item.cantidad - 1)}
                    onQuitar={() => quitar(item.id)}
                  />
                ))}
              </AnimatePresence>
            </motion.ul>
          )}

          {/* Línea suelta CTA */}
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setModalLineaSuelta(true)}
              className="mt-3 w-full px-3 py-2.5 rounded-lg border border-dashed border-border/60 text-[12px] text-muted-foreground hover:text-foreground hover:border-border transition-colors"
            >
              + Agregar línea sin código
            </button>
          )}
        </div>

        {/* Cámara — sección inferior fija cuando modoEscaneo
            flex-[42] = ~42% del cuerpo
            shrink-0 = nunca se achica
            relative = contiene el video con position absolute */}
        {modoEscaneo && (
          <div className="flex-[42] shrink-0 relative border-t-2 border-primary/30 overflow-hidden bg-black">
            <PosScanner key={scannerKey} onCodigo={manejarCodigo} />
            {/* Botón cerrar cámara — overlay arriba a la derecha */}
            <button
              type="button"
              onClick={() => setModoEscaneo(false)}
              className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-md text-white/80 hover:text-white hover:bg-black/70 transition-all active:scale-90 z-10"
              aria-label="Cerrar cámara"
              title="Cerrar cámara"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          FOOTER STICKY — total + COBRAR (siempre visible, z-50)
         ═══════════════════════════════════════════════════════ */}
      <footer className="shrink-0 border-t border-border/60 bg-card/95 backdrop-blur-md relative z-50 safe-area-pb">
        <div className="px-3 sm:px-5 py-3 space-y-2 max-w-3xl mx-auto w-full">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">Total</p>
              <p className="text-[11px] text-muted-foreground">
                {cantidadItems === 0
                  ? 'Sin items'
                  : `${cantidadItems} ${cantidadItems === 1 ? 'item' : 'items'}`}
              </p>
            </div>
            <TotalAnimado valor={total} />
          </div>

          <button
            type="button"
            onClick={() => setModalCobrar(true)}
            disabled={items.length === 0 || isPending}
            title="Abrir cobro (F2)"
            className={cn(
              'w-full h-12 rounded-xl text-base font-bold tracking-tight transition-all duration-150 press-scale flex items-center justify-center gap-2',
              items.length === 0 || isPending
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:brightness-110 glow-primary',
            )}
          >
            <ShoppingCart className="h-4 w-4" strokeWidth={2.25} />
            {isPending ? 'Procesando...' : 'COBRAR'}
          </button>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════
          MODALES
         ═══════════════════════════════════════════════════════ */}
      <PosModalCobrar
        open={modalCobrar}
        onClose={() => setModalCobrar(false)}
        total={total}
        esMayorista={esMayorista}
        cliente={clienteSeleccionado ?? null}
        onConfirmar={handleCobrar}
        isPending={isPending}
      />

      <PosModalLineaSuelta
        open={modalLineaSuelta}
        defaultDescripcion={busqueda.trim()}
        plan={plan}
        onClose={() => setModalLineaSuelta(false)}
        onConfirmar={(input) => {
          agregarLineaSuelta(input);
          setModalLineaSuelta(false);
          beep();
          searchRef.current?.focus();
        }}
      />

      {/* Modal post-venta — ticket + imprimir + compartir */}
      <PostVentaModal
        venta={ventaCompletada}
        onCerrar={() => setVentaCompletada(null)}
        onSeguirVendiendo={handleSeguirVendiendo}
      />

      {/* Modal confirmación sin stock */}
      <PosModalSinStock
        confirmacion={confirmSinStock}
        onClose={() => setConfirmSinStock(null)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Item del carrito — con stepper animado
// ─────────────────────────────────────────────────────────────────
function CarritoItem({
  item, esUltimo, onMas, onMenos, onQuitar,
}: {
  item: LineaCart;
  esUltimo: boolean;
  onMas: () => void;
  onMenos: () => void;
  onQuitar: () => void;
}) {
  const subtotal = item.precio * item.cantidad;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: 24, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -24, height: 0, marginTop: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      className={cn(
        'relative rounded-xl border bg-card overflow-hidden transition-colors',
        esUltimo
          ? 'border-primary/40 bg-primary/5 animate-glow-pulse'
          : 'border-border/60',
      )}
    >
      <div className="px-3.5 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold truncate leading-tight">{item.nombre}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-mono tabular-nums">
              {formatARS(item.precio)} c/u
            </p>
          </div>
          <button
            type="button"
            onClick={onQuitar}
            className="shrink-0 h-7 w-7 -mt-0.5 -mr-1 flex items-center justify-center rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Quitar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-0.5">
            <button
              type="button"
              onClick={onMenos}
              className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors active:scale-95"
              aria-label="Restar"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <AnimatePresence mode="popLayout">
              <motion.span
                key={item.cantidad}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.4, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="min-w-[2rem] text-center font-mono tabular-nums text-[14px] font-semibold"
              >
                {item.cantidad}
              </motion.span>
            </AnimatePresence>
            <button
              type="button"
              onClick={onMas}
              className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors active:scale-95"
              aria-label="Sumar"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="font-mono tabular-nums text-[15px] font-bold text-foreground">
            {formatARS(subtotal)}
          </p>
        </div>
      </div>
    </motion.li>
  );
}

// ─────────────────────────────────────────────────────────────────
// Selector de cliente compacto
// ─────────────────────────────────────────────────────────────────
function ClienteSelector({
  clientes, clienteId, onChange, esMayorista,
}: {
  clientes: Cliente[];
  clienteId: string | null;
  onChange: (id: string) => void;
  esMayorista: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const seleccionado = clientes.find((c) => c.id === clienteId);
  const esCF = seleccionado?.esConsumidorFinal ?? false;

  const lista = useMemo(() => {
    if (esMayorista) return clientes.filter((c) => c.tipo === 'mayorista' || c.tipo === 'ambos');
    return clientes;
  }, [clientes, esMayorista]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-colors text-left',
          esCF
            ? 'bg-muted/40 border-border/60 text-foreground'
            : 'bg-primary/5 border-primary/30 text-foreground',
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            'h-7 w-7 rounded-md flex items-center justify-center shrink-0',
            esCF ? 'bg-muted-foreground/15' : 'bg-primary/15',
          )}>
            <User className={cn('h-3.5 w-3.5', esCF ? 'text-muted-foreground' : 'text-primary')} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 leading-none">
              Cliente
            </p>
            <p className="text-[13px] font-medium truncate leading-tight mt-0.5">
              {seleccionado?.razonSocial ?? 'Seleccionar...'}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground/50 shrink-0 transition-transform',
            abierto && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence>
        {abierto && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setAbierto(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-30 max-h-[300px] overflow-y-auto"
            >
              {lista.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onChange(c.id); setAbierto(false); }}
                  className={cn(
                    'w-full flex items-center justify-between px-3.5 py-2.5 text-left text-[13px] hover:bg-muted/50 transition-colors border-b border-border/40 last:border-b-0',
                    c.id === clienteId && 'bg-primary/5 font-semibold',
                  )}
                >
                  <span className="truncate">{c.razonSocial}</span>
                  {c.esConsumidorFinal && (
                    <span className="text-[10px] text-muted-foreground ml-2 shrink-0">CF</span>
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────
function EmptyState({ modoEscaneo }: { modoEscaneo: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
        <ShoppingCart className="h-6 w-6 text-primary/70" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-medium">Carrito vacío</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
        {modoEscaneo
          ? 'Apuntá la cámara a un código de barras para agregar productos.'
          : 'Escaneá un código o buscá manualmente para empezar.'}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Total animado al cambiar
// ─────────────────────────────────────────────────────────────────
function TotalAnimado({ valor }: { valor: number }) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.p
        key={valor}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18 }}
        className="text-[28px] font-bold font-mono tabular-nums tracking-tight"
      >
        {formatARS(valor)}
      </motion.p>
    </AnimatePresence>
  );
}
