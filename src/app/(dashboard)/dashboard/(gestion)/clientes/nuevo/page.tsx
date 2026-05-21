import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ClienteForm } from '@/components/cliente-form';

export default function NuevoClientePage() {
  return (
    <div className="px-6 lg:px-10 py-8 max-w-3xl mx-auto animate-fade-up">
      <Link
        href="/dashboard/clientes"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6 group"
      >
        <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Clientes
      </Link>
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Nuevo cliente</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Datos comerciales, fiscales y configuración de cuenta corriente
        </p>
      </div>
      <ClienteForm />
    </div>
  );
}
