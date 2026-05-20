/**
 * Store del carrito del POS — Zustand con persistencia en localStorage.
 *
 * ¿Por qué Zustand y no Context?
 *   - Selectores granulares → re-renders solo en los componentes que usan
 *     el slice que cambió. En un POS con 30 items en el carrito, esto es
 *     la diferencia entre 60fps y 15fps.
 *   - Persistencia trivial → si el cajero recarga la página o se le cae
 *     la conexión a mitad de una venta, el carrito sobrevive.
 *   - API minúscula → no requiere envolver el árbol con Provider.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CanalVenta = 'minorista' | 'mayorista';

export type LineaCart = {
  /** ID único de la línea (no del producto). Permite múltiples líneas del mismo producto. */
  id: string;
  /** ID del producto en la BD. null = línea suelta sin producto. */
  productoId: string | null;
  nombre: string;
  descripcion: string;
  precio: number;
  cantidad: number;
  /** Por ahora solo 'por_unidad' (V1). Reservado para kg en V2. */
  tipoUnidad: 'por_unidad' | 'por_kg';
  /** Timestamp de último update — usado para destacar "recién agregado" */
  agregadoEn: number;
};

type PosCartState = {
  canal: CanalVenta;
  clienteId: string | null;
  items: LineaCart[];
  modoEscaneo: boolean;
  /** ID de la última línea modificada — la UI la destaca por unos ms */
  ultimaLineaId: string | null;

  // ── Acciones ────────────────────────────────────────────────
  setCanal: (canal: CanalVenta) => void;
  setClienteId: (id: string | null) => void;
  setModoEscaneo: (v: boolean) => void;

  /** Agregar producto. Si ya existe en el carrito (mismo productoId), incrementa. */
  agregarProducto: (input: {
    productoId: string;
    nombre: string;
    descripcion?: string;
    precio: number;
    cantidad?: number;
    tipoUnidad?: 'por_unidad' | 'por_kg';
  }) => void;

  /** Agregar línea suelta (sin producto en BD) */
  agregarLineaSuelta: (input: {
    descripcion: string;
    precio: number;
    cantidad: number;
  }) => void;

  cambiarCantidad: (id: string, cantidad: number) => void;
  quitar: (id: string) => void;
  vaciar: () => void;
};

let idCounter = 0;
function nuevoId() {
  idCounter++;
  return `${Date.now()}-${idCounter}`;
}

export const usePosCart = create<PosCartState>()(
  persist(
    (set) => ({
      canal: 'minorista',
      clienteId: null,
      items: [],
      modoEscaneo: false,
      ultimaLineaId: null,

      setCanal: (canal) => set({ canal }),
      setClienteId: (clienteId) => set({ clienteId }),
      setModoEscaneo: (modoEscaneo) => set({ modoEscaneo }),

      agregarProducto: ({ productoId, nombre, descripcion = '', precio, cantidad = 1, tipoUnidad = 'por_unidad' }) =>
        set((s) => {
          // Si ya existe el producto en el carrito → incrementar
          const existente = s.items.find((i) => i.productoId === productoId);
          if (existente) {
            return {
              items: s.items.map((i) =>
                i.id === existente.id
                  ? { ...i, cantidad: i.cantidad + cantidad, agregadoEn: Date.now() }
                  : i,
              ),
              ultimaLineaId: existente.id,
            };
          }
          const nueva: LineaCart = {
            id: nuevoId(),
            productoId,
            nombre,
            descripcion,
            precio,
            cantidad,
            tipoUnidad,
            agregadoEn: Date.now(),
          };
          return {
            items: [nueva, ...s.items],
            ultimaLineaId: nueva.id,
          };
        }),

      agregarLineaSuelta: ({ descripcion, precio, cantidad }) =>
        set((s) => {
          const nueva: LineaCart = {
            id: nuevoId(),
            productoId: null,
            nombre: descripcion,
            descripcion: '',
            precio,
            cantidad,
            tipoUnidad: 'por_unidad',
            agregadoEn: Date.now(),
          };
          return {
            items: [nueva, ...s.items],
            ultimaLineaId: nueva.id,
          };
        }),

      cambiarCantidad: (id, cantidad) =>
        set((s) => ({
          items:
            cantidad <= 0
              ? s.items.filter((i) => i.id !== id)
              : s.items.map((i) => (i.id === id ? { ...i, cantidad, agregadoEn: Date.now() } : i)),
          ultimaLineaId: cantidad > 0 ? id : null,
        })),

      quitar: (id) =>
        set((s) => ({
          items: s.items.filter((i) => i.id !== id),
          ultimaLineaId: null,
        })),

      vaciar: () => set({ items: [], ultimaLineaId: null }),
    }),
    {
      name: 'gesto-pos-cart',
      storage: createJSONStorage(() => localStorage),
      // No persistir modoEscaneo ni ultimaLineaId — son estados de UI volátiles
      partialize: (s) => ({
        canal: s.canal,
        clienteId: s.clienteId,
        items: s.items,
      }),
    },
  ),
);

// ── Selectores derivados ──────────────────────────────────────
/** Total monetario del carrito */
export const selectTotal = (s: PosCartState): number =>
  s.items.reduce((acc, i) => acc + i.precio * i.cantidad, 0);

/** Cantidad de líneas distintas (no items totales) */
export const selectCantidadLineas = (s: PosCartState): number => s.items.length;

/** Cantidad total de items (suma cantidades) */
export const selectCantidadItems = (s: PosCartState): number =>
  s.items.reduce((acc, i) => acc + i.cantidad, 0);
