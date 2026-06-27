import { notFound } from 'next/navigation';
import { obtenerTenant } from '@/server/actions/config';
import { ConfigForm } from '@/components/config-form';
import { FontScaleSelector } from '@/components/font-scale-selector';

type Props = { searchParams: Promise<{ mp?: string }> };

export default async function ConfigPage({ searchParams }: Props) {
  const [tenant, { mp }] = await Promise.all([obtenerTenant(), searchParams]);
  if (!tenant) notFound();

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-3xl mx-auto animate-fade-up">
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Datos del negocio y preferencias generales
        </p>
      </div>
      <ConfigForm tenant={tenant} mpStatus={mp} />

      <div className="mt-6">
        <FontScaleSelector />
      </div>
    </div>
  );
}
