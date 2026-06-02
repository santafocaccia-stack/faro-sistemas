import Link from 'next/link';
import { Plus, Tags, Zap, FileUp, Package } from 'lucide-react';
import { listarProductos } from '@/server/actions/productos';
import { listarCategorias, listarGruposVariantes } from '@/server/actions/categorias';
import { obtenerTenant } from '@/server/actions/config';
import { ProductosListClient } from '@/components/productos-list-client';
import { PreciosVivos } from '@/components/precios-vivos';
import { PageHeader } from '@/components/ui/page-header';

export default async function ProductosPage() {
  const [productos, categorias, gruposVariantes, tenant] = await Promise.all([
    listarProductos(),
    listarCategorias(),
    listarGruposVariantes(),
    obtenerTenant(),
  ]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-6xl mx-auto space-y-6 animate-fade-up">

      {/* Header */}
      <PageHeader
        icon={Package}
        title="Productos"
        subtitle={`${productos.length} ${productos.length === 1 ? 'producto' : 'productos'} en el catálogo`}
        action={
          <div className="flex items-center gap-1.5 sm:gap-2">
            {tenant?.preciosVivos && (
              <PreciosVivos
                productos={productos.map((p) => ({ id: p.id, nombre: p.nombre, categoriaId: p.categoriaId, precioMinorista: String(p.precioMinorista), activo: p.activo }))}
                categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
              />
            )}
            <Link
              href="/dashboard/productos/categorias"
              title="Categorías y variantes"
              className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 h-9 rounded-lg border border-border bg-card text-[13px] font-medium text-muted-foreground hover:text-foreground hover:border-border/80 transition-all"
            >
              <Tags className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden lg:inline">Categorías</span>
            </Link>
            <Link
              href="/dashboard/productos/carga-rapida"
              title="Carga rápida de varios productos"
              className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 h-9 rounded-lg border border-border bg-card text-[13px] font-medium text-muted-foreground hover:text-foreground hover:border-border/80 transition-all"
            >
              <Zap className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden lg:inline">Carga rápida</span>
            </Link>
            <Link
              href="/dashboard/productos/importar-csv"
              title="Importar desde CSV"
              className="hidden sm:inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 h-9 rounded-lg border border-border bg-card text-[13px] font-medium text-muted-foreground hover:text-foreground hover:border-border/80 transition-all"
            >
              <FileUp className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden lg:inline">CSV</span>
            </Link>
            <Link
              href="/dashboard/productos/nuevo"
              className="glow-primary inline-flex items-center justify-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold transition-all"
            >
              <Plus className="h-4 w-4" strokeWidth={2.25} />
              <span className="hidden sm:inline">Nuevo</span>
            </Link>
          </div>
        }
      />

      <ProductosListClient productos={productos} categorias={categorias} gruposVariantes={gruposVariantes} />
    </div>
  );
}
