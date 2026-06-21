'use client';

import { useState, useTransition } from 'react';
import { Check } from 'lucide-react';
import type { PLANES, PlanId } from '@/lib/planes';

type Plan = (typeof PLANES)[keyof typeof PLANES];

type Props = {
  plan: Plan;
  dolarMep: number;
  esPlanActual: boolean;
  /** true = ya está pagando, el botón se deshabilita. false = trial vencido/suspendido, puede re-suscribirse */
  suscripcionActiva: boolean;
  onContratar: (planId: PlanId) => Promise<void>;
};

export function PlanCard({ plan, dolarMep, esPlanActual, suscripcionActiva, onContratar }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const precioArs = Math.round(plan.precioUsd * dolarMep);

  function handleContratar() {
    setError(null);
    startTransition(async () => {
      try {
        await onContratar(plan.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al procesar el pago');
      }
    });
  }

  // Plan no disponible todavía (Food / Balanza): se muestra atenuado.
  const proximamente = 'proximamente' in plan && plan.proximamente;

  // Deshabilitar solo si ya tiene suscripción activa en este plan
  const deshabilitado = isPending || proximamente || (esPlanActual && suscripcionActiva);

  return (
    <div className={`relative flex flex-col rounded-xl border bg-card p-5 transition-all ${
      proximamente ? 'border-border opacity-65 saturate-[0.4]' :
      esPlanActual ? 'border-primary/40 shadow-[0_0_0_1px_oklch(var(--primary)_/_0.2)]' : 'border-border'
    }`}>
      {proximamente ? (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border text-[10px] font-semibold whitespace-nowrap uppercase tracking-wide">
          Próximamente
        </span>
      ) : esPlanActual && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold whitespace-nowrap">
          Plan actual
        </span>
      )}

      {/* Dot de color */}
      <div
        className="h-8 w-8 rounded-lg mb-4 flex-shrink-0"
        style={{ background: plan.color, opacity: proximamente ? 0.4 : 0.85 }}
      />

      <h3 className="font-semibold text-sm">{plan.nombre}</h3>
      <p className="text-xs text-muted-foreground mt-1 mb-4 leading-relaxed">{plan.descripcion}</p>

      {/* Precio — oculto si está por venir */}
      <div className="mb-5">
        {proximamente ? (
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-semibold text-muted-foreground">Muy pronto</span>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tabular-nums">U$S {plan.precioUsd}</span>
              <span className="text-xs text-muted-foreground">/mes</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono tabular-nums" suppressHydrationWarning>
              ≈ ${precioArs.toLocaleString('es-AR')} ARS
            </p>
          </>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-1.5 flex-1 mb-5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-success mt-0.5 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      {error && (
        <p className="text-xs text-destructive mb-3">{error}</p>
      )}

      <button
        onClick={handleContratar}
        disabled={deshabilitado}
        className={`w-full h-9 rounded-lg text-sm font-medium transition-all ${
          deshabilitado
            ? 'bg-muted text-muted-foreground cursor-default'
            : 'bg-primary text-primary-foreground hover:brightness-110'
        }`}
      >
        {proximamente
          ? 'Próximamente'
          : isPending
            ? 'Redirigiendo...'
            : esPlanActual && suscripcionActiva
              ? 'Versión activa'
              : esPlanActual
                ? 'Continuar con esta versión'
                : 'Contratar'}
      </button>
    </div>
  );
}
