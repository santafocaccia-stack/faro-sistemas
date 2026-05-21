import Link from 'next/link';
import { Plus, Tags, Zap, FileUp } from 'lucide-react';
import { listarProductos } from '@/server/actions/productos';
import { listarCategorias } from '@/server/actions/categorias';
import { ProductosListClient } from '@/components/productos-list-client';

export default async function ProductosPage() {
  const [productos, categorias] = await Promise.all([
    listarProductos(),
    listarCategorias(),
  ]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-6xl mx-auto space-y-6 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Productos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {productos.length} {productos.length === 1 ? 'producto' : 'productos'} en el catálogo
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/productos/categorias"
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-border bg-card text-[13px] font-medium text-muted-foreground hover:text-foreground hover:border-border/80 transition-all"
          >
            <Tags className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="hidden sm:inline">Categorías</span>
          </Link>
          <Link
            href="/dashboard/productos/carga-rapida"
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-border bg-card text-[13px] font-medium text-muted-foreground hover:text-foreground hover:border-border/80 transition-all"
            title="Cargar varios productos rápidamente"
          >
            <Zap className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="hidden sm:inline">Carga rápida</span>
          </Link>
          <Link
            href="/dashboard/productos/importar-csv"
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-border bg-card text-[13px] font-medium text-muted-foreground hover:text-foreground hover:border-border/80 transition-all"
            title="Importar productos desde un archivo CSV"
          >
            <FileUp className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="hidden lg:inline">CSV</span>
          </Link>
          <Link
            href="/dashboard/productos/nuevo"
            className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 transition-all glow-primary"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
            <span className="hidden sm:inline">Nuevo producto</span>
            <span className="sm:hidden">Nuevo</span>
          </Link>
        </div>
      </div>

      <ProductosListClient productos={productos} categorias={categorias} />
    </div>
  );
}
