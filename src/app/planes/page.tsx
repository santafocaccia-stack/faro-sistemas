import { Check } from 'lucide-react';
import { requireSession } from '@/server/auth/session';
import { getDolarMep } from '@/lib/dolar';
import { PLANES_ARRAY } from '@/lib/planes';
import { getDatosTransferencia } from '@/lib/transferencia';
import { PlanCard } from './plan-card';
import { PlanesAcciones } from './planes-acciones';
import { PagarTransferencia } from './transferencia';
import { crearSuscripcionMP } from '@/server/actions/suscripcion';
import { GestoLogo } from '@/components/brand/gesto-logo';

export default async function PlanesPage() {
  const session = await requireSession({ allowExpired: true });
  const dolarMep = await getDolarMep();

  const diasRestantes = session.trialEnd
    ? Math.ceil((new Date(session.trialEnd).getTime() - Date.now()) / 86_400_000)
    : null;

  const trialVencido = diasRestantes !== null && diasRestantes <= 0;

  const datosTransferencia = getDatosTransferencia();
  const planesLite = PLANES_ARRAY.filter((p) => !p.proximamente).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    precioUsd: p.precioUsd,
  }));

  const mostrarDashboard =
    session.status === 'activo' || session.status === 'moroso' || !trialVencido;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 py-16">

      {/* Barra superior con acciones de escape — siempre visible (mobile incluido) */}
      <div className="fixed top-0 inset-x-0 z-20 flex justify-end gap-2 p-3 sm:p-4 bg-gradient-to-b from-background via-background/80 to-transparent">
        <PlanesAcciones mostrarDashboard={mostrarDashboard} />
      </div>

      {/* Logo */}
      <div className="flex items-center mb-10 mt-12 sm:mt-8">
        <GestoLogo markColor="var(--gesto-brand)" style={{ height: 28, width: 'auto' }} />
      </div>

      {/* Header */}
      <div className="text-center mb-10 max-w-xl">
        {session.status === 'suspendido' ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Tu cuenta está suspendida</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Elegí un plan para reactivar tu cuenta. Todos tus datos siguen intactos.
            </p>
          </>
        ) : session.status === 'moroso' ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Hay un problema con tu pago</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Tu último pago no pudo procesarse. Suscribite de nuevo para evitar la suspensión.
            </p>
          </>
        ) : trialVencido ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Tu prueba gratuita venció</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Elegí un plan para seguir usando Gesto. Cancelás cuando quieras.
            </p>
          </>
        ) : diasRestantes !== null && diasRestantes <= 3 ? (
          <>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning/15 border border-warning/20 text-warning text-xs font-medium mb-4">
              Te quedan {diasRestantes} {diasRestantes === 1 ? 'día' : 'días'} de prueba
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Elegí tu versión</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Precios en USD cobrados en pesos al dólar MEP del día.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Elegí tu versión</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Precios en USD cobrados en pesos al dólar MEP del día.
            </p>
          </>
        )}
        <p className="text-xs text-muted-foreground/60 mt-1">
          Dólar MEP de referencia: ${dolarMep.toLocaleString('es-AR')}
        </p>
      </div>

      {/* Grid de planes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl">
        {PLANES_ARRAY.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            dolarMep={dolarMep}
            esPlanActual={session.plan === plan.id}
            suscripcionActiva={session.status === 'activo'}
            onContratar={crearSuscripcionMP}
          />
        ))}
      </div>

      {/* Pago por transferencia — método activo hoy */}
      <div className="mt-12 flex flex-col items-center gap-3 w-full">
        <div className="flex items-center gap-3 w-full max-w-md">
          <span className="h-px flex-1 bg-border/60" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-[0.08em]">Forma de pago</span>
          <span className="h-px flex-1 bg-border/60" />
        </div>
        <PagarTransferencia
          planes={planesLite}
          planActual={session.plan}
          dolarMep={dolarMep}
          datos={datosTransferencia}
        />
      </div>

      {/* Footer */}
      <div className="mt-10 flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Check className="h-3 w-3 text-success" /> Cancelás cuando quieras</span>
          <span className="flex items-center gap-1"><Check className="h-3 w-3 text-success" /> Sin permanencia</span>
          <span className="flex items-center gap-1"><Check className="h-3 w-3 text-success" /> Soporte por WhatsApp</span>
        </div>
      </div>
    </div>
  );
}
