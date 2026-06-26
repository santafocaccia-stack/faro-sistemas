import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { listarCategorias, listarGruposVariantes } from '@/server/actions/categorias';
import { CategoriasManager } from '@/components/categorias-manager';
import { requireSession } from '@/server/auth/session';

export default async function CategoriasPage() {
  const [categorias, grupos, session] = await Promise.all([
    listarCategorias(),
    listarGruposVariantes(),
    requireSession(),
  ]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-6xl mx-auto space-y-6 animate-fade-up">

      <Link
        href="/dashboard/productos"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Productos
      </Link>

      <div>
        <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Categorías</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Organizá tu catálogo agrupando productos por categoría.
        </p>
      </div>

      <CategoriasManager categorias={categorias} grupos={grupos} plan={session.plan} />
    </div>
  );
}
