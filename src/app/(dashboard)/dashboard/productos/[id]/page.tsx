import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Layers } from 'lucide-react';
import { obtenerProducto } from '@/server/actions/productos';
import { listarVinculosProducto } from '@/server/actions/proveedores';
import { listarCategorias, listarGruposVariantes, listarProductosDeGrupo } from '@/server/actions/categorias';
import { listarProveedores } from '@/server/actions/proveedores';
import { ProductoForm } from '@/components/producto-form';
import { AjusteStockForm } from '@/components/ajuste-stock-form';
import { formatARS, formatKg } from '@/lib/utils';
import { requireSession } from '@/server/auth/session';

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, producto, categorias, gruposVariantes, proveedoresDisponibles, vinculos] = await Promise.all([
    requireSession(),
    obtenerProducto(id),
    listarCategorias(),
    listarGruposVariantes(),
    listarProveedores(),
    listarVinculosProducto(id),
  ]);

  // Variantes ocultas por ahora: no se muestran agrupaciones de variantes,
  // aunque los datos siguen en la DB. (Ver producto-form.tsx.)
  const MOSTRAR_VARIANTES = false;

  // Otras variantes del mismo grupo (solo si tiene grupo asignado)
  const otrasVariantes = MOSTRAR_VARIANTES && producto?.grupoVarianteId
    ? await listarProductosDeGrupo(producto.grupoVarianteId, id)
    : [];

  const grupoActual = producto?.grupoVarianteId
    ? gruposVariantes.find((g) => g.id === producto.grupoVarianteId)
    : null;

  if (!producto) notFound();

  const stockNum = Number(producto.stockActual);
  const stockBajo = producto.stockMinimo && stockNum <= Number(producto.stockMinimo);

  return (
    <div className="px-6 lg:px-10 py-8 max-w-3xl mx-auto space-y-8 animate-fade-up">

      <Link
        href="/dashboard/productos"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Productos
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          {producto.codigo && (
            <p className="font-mono text-xs text-muted-foreground mb-1">{producto.codigo}</p>
          )}
          <h1 className="text-[28px] font-semibold tracking-tight leading-tight">{producto.nombre}</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="rounded-xl border border-border bg-card px-4 py-2.5 text-right">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Stock</p>
            <p className={`font-mono tabular-nums text-base font-semibold ${stockBajo ? 'text-warning' : ''}`}>
              {producto.tipoUnidad === 'por_kg' ? formatKg(stockNum) : `${stockNum} un`}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-2.5 text-right">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">P. Minor.</p>
            <p className="font-mono tabular-nums text-base font-semibold">{formatARS(Number(producto.precioMinorista))}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-2.5 text-right">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">P. Mayor.</p>
            <p className="font-mono tabular-nums text-base font-semibold">{formatARS(Number(producto.precioMayorista))}</p>
          </div>
        </div>
      </div>

      <AjusteStockForm
        productoId={producto.id}
        stockActual={stockNum}
        tipoUnidad={producto.tipoUnidad}
      />

      <ProductoForm
        producto={producto}
        categorias={categorias}
        gruposVariantes={gruposVariantes}
        proveedoresDisponibles={proveedoresDisponibles}
        vinculosIniciales={vinculos}
        plan={session.plan}
      />

      {/* Otras variantes del mismo grupo (oculto por ahora) */}
      {MOSTRAR_VARIANTES && otrasVariantes.length > 0 && grupoActual && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Layers className="h-4 w-4 text-primary" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                Otras variantes — {grupoActual.nombre}
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {otrasVariantes.length} {otrasVariantes.length === 1 ? 'variante' : 'variantes'} en este grupo
              </p>
            </div>
          </div>
          <div className="divide-y divide-border/40">
            {otrasVariantes.map((v) => {
              const stock = Number(v.stockActual);
              const stockLabel = v.tipoUnidad === 'por_kg' ? formatKg(stock) : `${stock} un`;
              return (
                <Link
                  key={v.id}
                  href={`/dashboard/productos/${v.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-foreground/[0.02] transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {v.nombre}
                    </p>
                    {v.codigo && (
                      <p className="text-[11px] text-muted-foreground font-mono">{v.codigo}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <span className="text-xs text-muted-foreground font-mono tabular-nums hidden sm:block">
                      {stockLabel}
                    </span>
                    <span className="text-xs font-mono tabular-nums">
                      {formatARS(Number(v.precioMinorista))}
                    </span>
                    <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/40 rotate-180" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
