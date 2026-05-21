import { Check } from 'lucide-react';
import { requireSession } from '@/server/auth/session';
import { getDolarMep } from '@/lib/dolar';
import { PLANES_ARRAY } from '@/lib/planes';
import { PlanCard } from './plan-card';
import { crearSuscripcionMP } from '@/server/actions/suscripcion';

export default async function PlanesPage() {
  const session = await requireSession({ allowExpired: true });
  const dolarMep = await getDolarMep();

  const diasRestantes = session.trialEnd
    ? Math.ceil((new Date(session.trialEnd).getTime() - Date.now()) / 86_400_000)
    : null;

  const trialVencido = diasRestantes !== null && diasRestantes <= 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 py-16">

      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="h-9 w-9 rounded-[10px] bg-gradient-to-br from-primary to-[oklch(0.55_0.18_28)] flex items-center justify-center shadow-[0_0_0_1px_oklch(1_0_0_/_0.08)_inset,0_8px_24px_oklch(0.68_0.19_38_/_0.4)]">
          <span className="text-primary-foreground font-bold text-base leading-none tracking-tight">G</span>
        </div>
        <p className="font-semibold text-base tracking-tight">Gesto</p>
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
            <h1 className="text-2xl font-semibold tracking-tight">Elegí tu plan</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Precios en USD cobrados en pesos al dólar MEP del día.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Elegí tu plan</h1>
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
            onContratar={crearSuscripcionMP}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-10 flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Check className="h-3 w-3 text-success" /> Cancelás cuando quieras</span>
          <span className="flex items-center gap-1"><Check className="h-3 w-3 text-success" /> Sin permanencia</span>
          <span className="flex items-center gap-1"><Check className="h-3 w-3 text-success" /> Soporte por WhatsApp</span>
        </div>
        {!trialVencido && (
          <a href="/dashboard" className="text-xs text-muted-foreground/60 hover:text-muted-foreground mt-2 transition-colors">
            Volver al dashboard
          </a>
        )}
      </div>
    </div>
  );
}
