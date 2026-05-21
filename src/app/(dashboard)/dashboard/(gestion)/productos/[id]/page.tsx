import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { obtenerProducto } from '@/server/actions/productos';
import { listarVinculosProducto } from '@/server/actions/proveedores';
import { listarCategorias, listarGruposVariantes } from '@/server/actions/categorias';
import { listarProveedores } from '@/server/actions/proveedores';
import { ProductoForm } from '@/components/producto-form';
import { AjusteStockForm } from '@/components/ajuste-stock-form';
import { formatARS, formatKg } from '@/lib/utils';

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [producto, categorias, gruposVariantes, proveedoresDisponibles, vinculos] = await Promise.all([
    obtenerProducto(id),
    listarCategorias(),
    listarGruposVariantes(),
    listarProveedores(),
    listarVinculosProducto(id),
  ]);

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
      />
    </div>
  );
}
