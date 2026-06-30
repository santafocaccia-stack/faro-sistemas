'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Check, ChevronRight, X, Building2, Package, ShoppingCart, Users,
  FileText, Landmark, MapPin, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RichardAvatar } from '@/components/onboarding/richard-avatar';
import {
  RICHARD, pasosDelPlan, onboardingCompletado,
  type ProgresoOnboarding, type IconKey,
} from '@/lib/onboarding';
import type { PlanId } from '@/lib/planes';

const ICONOS: Record<IconKey, LucideIcon> = {
  config:      Building2,
  productos:   Package,
  ventas:      ShoppingCart,
  clientes:    Users,
  presupuesto: FileText,
  prestamo:    Landmark,
  pedido:      MapPin,
};

/**
 * Checklist de primeros pasos guiada por Richard. Personalizada por rubro:
 * cada plan muestra su propia secuencia (productos/ventas para market,
 * clientes/presupuesto para servicios, etc.). Se oculta cuando está completa
 * o si el usuario la descarta.
 */
export function OnboardingWizard({
  progreso,
  plan,
  negocio,
}: {
  progreso: ProgresoOnboarding;
  plan: PlanId;
  negocio: string;
}) {
  const dismissKey = `gesto:wizard-dismissed:${plan}`;
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (typeof window !== 'undefined') {
      setDismissed(localStorage.getItem(dismissKey) === 'true');
    }
  }, [dismissKey]);

  function handleDismiss() {
    if (typeof window !== 'undefined') localStorage.setItem(dismissKey, 'true');
    setDismissed(true);
  }

  if (!hydrated) return null;
  if (onboardingCompletado(plan, progreso) || dismissed) return null;

  const pasos = pasosDelPlan(plan);
  const completados = pasos.filter((p) => progreso[p.key]).length;
  const total = pasos.length;
  const porcentaje = (completados / total) * 100;

  return (
    <div className="relative rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card overflow-hidden">
      {/* Glow decorativo */}
      <div
        aria-hidden
        className="absolute -top-10 -right-10 h-40 w-40 rounded-full pointer-events-none opacity-30"
        style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--primary) 40%, transparent), transparent 70%)' }}
      />

      {/* Header: Richard te habla */}
      <div className="relative px-5 pt-5 pb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/12 border border-primary/20 flex items-center justify-center shrink-0">
            <RichardAvatar size={30} />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              {RICHARD.nombre} te acompaña en {negocio}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {completados} de {total} {completados === 1 ? 'paso completado' : 'pasos completados'} · {RICHARD.lemaChecklist}
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors shrink-0"
          title="Ocultar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Barra de progreso */}
      <div className="relative px-5 pb-4">
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>

      {/* Pasos */}
      <div className="relative px-3 pb-3 space-y-1">
        {pasos.map((paso) => {
          const done = progreso[paso.key];
          const Icon = ICONOS[paso.icon];
          return (
            <Link
              key={paso.key}
              href={paso.href}
              className={cn(
                'flex items-center gap-3 px-2.5 py-2.5 rounded-lg group transition-all',
                done ? 'opacity-50 hover:opacity-70' : 'hover:bg-white/[0.04]',
              )}
            >
              <div className={cn(
                'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                done ? 'border-primary bg-primary' : 'border-muted-foreground/30 group-hover:border-primary/60',
              )}>
                {done && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
              </div>

              <Icon className={cn('h-4 w-4 shrink-0', done ? 'text-muted-foreground' : 'text-primary')} strokeWidth={1.75} />

              <div className="flex-1 min-w-0">
                <p className={cn('text-[13px] font-medium', done && 'line-through text-muted-foreground')}>
                  {paso.label}
                  {paso.opcional && !done && (
                    <span className="ml-1.5 text-[10px] font-normal text-muted-foreground/60">opcional</span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground/70 leading-tight">{paso.descripcion}</p>
              </div>

              {!done && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
