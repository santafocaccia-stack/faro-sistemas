'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search, Pencil, Power, Boxes, MoreHorizontal, Plus, Package,
} from 'lucide-react';
import { cn, formatARS, formatKg } from '@/lib/utils';
import { toggleActivoProducto } from '@/server/actions/productos';
import type { Producto, Categoria, GrupoVariante } from '@/server/db/schema';

type Props = {
  productos: Producto[];
  categorias: Categoria[];
  gruposVariantes?: GrupoVariante[];
};

type Filtro = 'todos' | 'activos' | 'inactivos' | 'stock_bajo';

// Variantes ocultas por ahora: el filtro por grupo de variantes no se muestra,
// pero los datos siguen intactos en la DB.
const MOSTRAR_VARIANTES = false;

export function ProductosListClient({ productos, categorias, gruposVariantes = [] }: Props) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('activos');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [grupoFiltro, setGrupoFiltro] = useState<string | null>(null);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  /** Mapa { categoriaId → nombre } para mostrar el nombre en cada fila */
  const mapaCategorias = useMemo(() => {
    const m = new Map<string, string>();
    categorias.forEach((c) => m.set(c.id, c.nombre));
    return m;
  }, [categorias]);

  /** Categorías que tienen al menos un producto — para no mostrar chips vacíos */
  const categoriasConProductos = useMemo(() => {
    const usadas = new Set(productos.map((p) => p.categoriaId).filter(Boolean));
    return categorias.filter((c) => usadas.has(c.id));
  }, [categorias, productos]);

  /** Grupos de variantes con al menos 2 productos (si tiene 1 solo no tiene sentido filtrar).
   *  Variantes ocultas por ahora: devolvemos siempre [] para no mostrar el filtro,
   *  aunque los datos siguen intactos en la DB. */
  const gruposConProductos = useMemo(() => {
    if (!MOSTRAR_VARIANTES) return [];
    const conteo = new Map<string, number>();
    productos.forEach((p) => {
      if (p.grupoVarianteId) conteo.set(p.grupoVarianteId, (conteo.get(p.grupoVarianteId) ?? 0) + 1);
    });
    return gruposVariantes.filter((g) => (conteo.get(g.id) ?? 0) >= 2);
  }, [gruposVariantes, productos]);

  const stockBajoCount = useMemo(() =>
    productos.filter((p) => p.stockMinimo && Number(p.stockActual) <= Number(p.stockMinimo)).length,
    [productos],
  );

  const filtrados = useMemo(() => {
    let lista = productos;

    if (busqueda) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(
        (p) => p.nombre.toLowerCase().includes(q) || (p.codigo ?? '').toLowerCase().includes(q),
      );
    }

    if (filtro === 'activos')    lista = lista.filter((p) => p.activo);
    if (filtro === 'inactivos')  lista = lista.filter((p) => !p.activo);
    if (filtro === 'stock_bajo') lista = lista.filter(
      (p) => p.activo && p.stockMinimo && Number(p.stockActual) <= Number(p.stockMinimo),
    );

    if (categoriaFiltro) {
      lista = lista.filter((p) => p.categoriaId === categoriaFiltro);
    }

    if (grupoFiltro) {
      lista = lista.filter((p) => p.grupoVarianteId === grupoFiltro);
    }

    return lista;
  }, [productos, busqueda, filtro, categoriaFiltro]);

  function handleToggleActivo(e: React.MouseEvent, id: string, nombre: string, activo: boolean) {
    e.stopPropagation();
    setMenuAbierto(null);
    startTransition(async () => {
      try {
        await toggleActivoProducto(id);
        toast.success(activo ? `"${nombre}" desactivado` : `"${nombre}" activado`);
      } catch {
        toast.error('Error al cambiar estado');
      }
    });
  }

  const FILTROS: { value: Filtro; label: string; count?: number }[] = [
    { value: 'activos',    label: 'Activos',     count: productos.filter((p) => p.activo).length },
    { value: 'inactivos',  label: 'Inactivos',   count: productos.filter((p) => !p.activo).length },
    { value: 'stock_bajo', label: '⚠ Stock bajo', count: stockBajoCount },
    { value: 'todos',      label: 'Todos',        count: productos.length },
  ];

  return (
    <div className="space-y-4">

      {/* Barra de búsqueda + filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background/40 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Filtros pill */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {FILTROS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={cn(
                'shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-[12px] font-medium transition-colors whitespace-nowrap',
                filtro === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-border/80',
              )}
            >
              {f.label}
              {f.count !== undefined && f.count > 0 && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                  filtro === f.value
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chips de categoría — solo si hay categorías con productos */}
      {categoriasConProductos.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mt-1">
          <button
            onClick={() => setCategoriaFiltro(null)}
            className={cn(
              'shrink-0 px-3 h-7 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap',
              categoriaFiltro === null
                ? 'bg-foreground text-background'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground',
            )}
          >
            Todas las categorías
          </button>
          {categoriasConProductos.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoriaFiltro(categoriaFiltro === c.id ? null : c.id)}
              className={cn(
                'shrink-0 px-3 h-7 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap',
                categoriaFiltro === c.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      )}

      {/* Chips de grupos de variantes — solo si hay grupos con ≥2 productos */}
      {gruposConProductos.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mt-1">
          <span className="shrink-0 px-2 h-7 flex items-center text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/50">
            Variantes
          </span>
          {gruposConProductos.map((g) => (
            <button
              key={g.id}
              onClick={() => setGrupoFiltro(grupoFiltro === g.id ? null : g.id)}
              className={cn(
                'shrink-0 inline-flex items-center gap-1 px-3 h-7 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap',
                grupoFiltro === g.id
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {g.nombre}
            </button>
          ))}
        </div>
      )}

      {/* Resultado vacío */}
      {filtrados.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-14 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/8 border border-primary/15 mx-auto mb-4 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" strokeWidth={1.75} />
          </div>
          {busqueda ? (
            <>
              <p className="text-sm font-medium mb-1">Sin resultados para "{busqueda}"</p>
              <p className="text-xs text-muted-foreground">Probá con otro nombre o código.</p>
            </>
          ) : filtro === 'inactivos' ? (
            <>
              <p className="text-sm font-medium mb-1">No hay productos inactivos</p>
              <p className="text-xs text-muted-foreground">Todos los productos están activos.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium mb-1">Catálogo vacío</p>
              <p className="text-xs text-muted-foreground mb-5 max-w-sm mx-auto">
                Empezá cargando los productos que vendés.
              </p>
              <Link
                href="/dashboard/productos/nuevo"
                className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 transition-all"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                Cargar primer producto
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Header tabla */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] sm:grid-cols-[1fr_100px_100px_100px_auto] gap-0 border-b border-border/60 bg-muted/30">
            <div className="h-10 flex items-center pl-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">Producto</div>
            <div className="h-10 hidden sm:flex items-center justify-end text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">Stock</div>
            <div className="h-10 hidden sm:flex items-center justify-end text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">P. Mayor.</div>
            <div className="h-10 hidden sm:flex items-center justify-end text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 pr-2">P. Minor.</div>
            <div className="h-10 flex items-center pr-3" />
          </div>

          {/* Filas */}
          <div className="divide-y divide-border/40">
            {filtrados.map((p) => {
              const stockNum = Number(p.stockActual);
              const stockBajo = p.stockMinimo && stockNum <= Number(p.stockMinimo);
              const stockLabel = p.tipoUnidad === 'por_kg'
                ? formatKg(stockNum)
                : `${stockNum} un`;

              return (
                <div
                  key={p.id}
                  className={cn(
                    'relative grid grid-cols-[1fr_auto_auto_auto_auto] sm:grid-cols-[1fr_100px_100px_100px_auto] items-center gap-0 hover:bg-white/[0.02] transition-colors cursor-pointer group',
                    !p.activo && 'opacity-50',
                  )}
                  onClick={() => router.push(`/dashboard/productos/${p.id}`)}
                >
                  {/* Nombre */}
                  <div className="pl-4 py-3 min-w-0">
                    <p className="text-[13px] font-medium truncate leading-tight">{p.nombre}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {p.codigo && (
                        <p className="text-[11px] text-muted-foreground font-mono">{p.codigo}</p>
                      )}
                      {p.categoriaId && mapaCategorias.has(p.categoriaId) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary/90 leading-none">
                          {mapaCategorias.get(p.categoriaId)}
                        </span>
                      )}
                      {/* Stock en mobile */}
                      <p className={cn(
                        'text-[11px] font-mono sm:hidden',
                        stockBajo ? 'text-warning font-semibold' : 'text-muted-foreground',
                      )}>
                        {stockBajo ? '⚠ ' : ''}{stockLabel}
                      </p>
                    </div>
                  </div>

                  {/* Stock desktop */}
                  <div className="hidden sm:flex justify-end py-3">
                    <span className={cn(
                      'font-mono tabular-nums text-[13px]',
                      stockBajo ? 'text-warning font-semibold' : '',
                    )}>
                      {stockLabel}
                    </span>
                  </div>

                  {/* P. mayorista */}
                  <div className="hidden sm:flex justify-end py-3 font-mono tabular-nums text-[13px] text-muted-foreground">
                    {formatARS(Number(p.precioMayorista))}
                  </div>

                  {/* P. minorista */}
                  <div className="hidden sm:flex justify-end py-3 pr-2 font-mono tabular-nums text-[13px]">
                    {formatARS(Number(p.precioMinorista))}
                  </div>

                  {/* Acciones */}
                  <div
                    className="pr-3 py-3 flex items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuAbierto(menuAbierto === p.id ? null : p.id); }}
                        className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Acciones"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {menuAbierto === p.id && (
                        <>
                          {/* Backdrop click to close */}
                          <div className="fixed inset-0 z-40" onClick={() => setMenuAbierto(null)} />

                          <div className="absolute right-0 top-8 z-50 w-44 rounded-lg border border-border bg-popover shadow-xl py-1 text-[13px]">
                            <Link
                              href={`/dashboard/productos/${p.id}`}
                              className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors"
                              onClick={() => setMenuAbierto(null)}
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              Editar datos
                            </Link>
                            <Link
                              href={`/dashboard/productos/${p.id}#stock`}
                              className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors"
                              onClick={() => setMenuAbierto(null)}
                            >
                              <Boxes className="h-3.5 w-3.5 text-muted-foreground" />
                              Ajustar stock
                            </Link>
                            <div className="border-t border-border/50 my-1" />
                            <button
                              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                              onClick={(e) => handleToggleActivo(e, p.id, p.nombre, p.activo)}
                            >
                              <Power className={cn('h-3.5 w-3.5', p.activo ? 'text-destructive' : 'text-success')} />
                              <span className={p.activo ? 'text-destructive' : 'text-success'}>
                                {p.activo ? 'Desactivar' : 'Activar'}
                              </span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer count */}
          {filtrados.length > 0 && (
            <div className="border-t border-border/40 px-4 py-2.5 bg-muted/20">
              <p className="text-[11px] text-muted-foreground">
                {filtrados.length} {filtrados.length === 1 ? 'producto' : 'productos'}
                {busqueda && ` para "${busqueda}"`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
