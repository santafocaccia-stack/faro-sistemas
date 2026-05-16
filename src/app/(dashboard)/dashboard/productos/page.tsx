import Link from 'next/link';
import { Plus } from 'lucide-react';
import { listarProductos } from '@/server/actions/productos';
import { ProductosListClient } from '@/components/productos-list-client';

export default async function ProductosPage() {
  const productos = await listarProductos();

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-6xl mx-auto space-y-6 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Productos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {productos.length} {productos.length === 1 ? 'producto' : 'productos'} en el catálogo
          </p>
        </div>
        <Link
          href="/dashboard/productos/nuevo"
          className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 transition-all glow-primary shrink-0"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
          <span className="hidden sm:inline">Nuevo producto</span>
          <span className="sm:hidden">Nuevo</span>
        </Link>
      </div>

      <ProductosListClient productos={productos} />
    </div>
  );
}
