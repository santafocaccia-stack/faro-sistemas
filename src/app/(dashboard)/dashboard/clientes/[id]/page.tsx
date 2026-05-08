import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { obtenerCliente } from '@/server/actions/clientes';
import { ClienteForm } from '@/components/cliente-form';

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = await obtenerCliente(id);
  if (!cliente) notFound();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/dashboard/clientes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Volver al listado
      </Link>
      <h1 className="text-2xl font-bold mb-6">{cliente.razonSocial}</h1>
      <ClienteForm cliente={cliente} />
    </div>
  );
}
