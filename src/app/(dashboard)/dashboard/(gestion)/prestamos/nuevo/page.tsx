import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { listarClientes } from '@/server/actions/clientes';
import { PrestamoForm } from './prestamo-form';

export const dynamic = 'force-dynamic';

export default async function NuevoPrestamoPage() {
  const clientes = await listarClientes();
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-2xl mx-auto space-y-6 animate-fade-up">
      <div>
        <Link href="/dashboard/prestamos" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mb-2">
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />Volver a préstamos
        </Link>
        <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Nuevo préstamo</h1>
        <p className="text-sm text-muted-foreground mt-1">El cronograma de cuotas se calcula automáticamente</p>
      </div>
      <PrestamoForm clientes={clientes.map((c) => ({ id: c.id, nombre: c.razonSocial }))} />
    </div>
  );
}
