import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProductoForm } from '@/components/producto-form';

export default function NuevoProductoPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link
        href="/dashboard/productos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al listado
      </Link>
      <h1 className="text-2xl font-bold mb-6">Nuevo producto</h1>
      <ProductoForm />
    </div>
  );
}
