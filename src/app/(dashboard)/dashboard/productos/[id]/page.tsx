import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { obtenerProducto } from '@/server/actions/productos';
import { ProductoForm } from '@/components/producto-form';

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const producto = await obtenerProducto(id);
  if (!producto) notFound();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link
        href="/dashboard/productos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al listado
      </Link>
      <h1 className="text-2xl font-bold mb-6">{producto.nombre}</h1>
      <ProductoForm producto={producto} />
    </div>
  );
}
