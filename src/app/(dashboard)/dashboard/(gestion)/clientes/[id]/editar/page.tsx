import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { obtenerCliente } from '@/server/actions/clientes';
import { ClienteForm } from '@/components/cliente-form';
import { requireSession } from '@/server/auth/session';

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, requireSession()]);
  const cliente = await obtenerCliente(id);
  if (!cliente) notFound();

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-3xl mx-auto space-y-8 animate-fade-up">
      <Link
        href={`/dashboard/clientes/${id}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        {cliente.razonSocial}
      </Link>

      <div>
        <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Editar cliente</h1>
      </div>

      <ClienteForm cliente={cliente} plan={session.plan} />
    </div>
  );
}
