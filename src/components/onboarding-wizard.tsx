'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Check, ChevronRight, X, Sparkles, Package, ShoppingCart, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Progreso = {
  tieneProductos: boolean;
  tieneClientes: boolean;
  tieneVentas: boolean;
  datosNegocioCompletos: boolean;
  completado: boolean;
};

const DISMISS_KEY = 'gesto:wizard-dismissed';

export function OnboardingWizard({ progreso }: { progreso: Progreso }) {
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Leer estado dismiss de localStorage solo después de hidratar
  useEffect(() => {
    setHydrated(true);
    if (typeof window !== 'undefined') {
      setDismissed(localStorage.getItem(DISMISS_KEY) === 'true');
    }
  }, []);

  function handleDismiss() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISS_KEY, 'true');
    }
    setDismissed(true);
  }

  // No mostrar si: ya completó todo, o si lo descartó manualmente
  if (!hydrated) return null;
  if (progreso.completado || dismissed) return null;

  const pasos = [
    {
      done: progreso.datosNegocioCompletos,
      label: 'Completar datos del negocio',
      descripcion: 'CUIT, dirección y teléfono para tus comprobantes',
      href: '/dashboard/config',
      icon: Building2,
    },
    {
      done: progreso.tieneProductos,
      label: 'Cargar tu primer producto',
      descripcion: 'Empezá con uno y después agregás más',
      href: '/dashboard/productos/nuevo',
      icon: Package,
    },
    {
      done: progreso.tieneVentas,
      label: 'Registrar tu primera venta',
      descripcion: 'Probá el punto de venta',
      href: '/dashboard/ventas',
      icon: ShoppingCart,
    },
  ];

  const completados = pasos.filter((p) => p.done).length;
  const total = pasos.length;
  const porcentaje = (completados / total) * 100;

  return (
    <div className="relative rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card overflow-hidden">
      {/* Glow decorativo */}
      <div
        aria-hidden
        className="absolute -top-10 -right-10 h-40 w-40 rounded-full pointer-events-none opacity-30"
        style={{ background: 'radial-gradient(circle, oklch(0.68 0.19 38 / 0.4), transparent 70%)' }}
      />

      {/* Header */}
      <div className="relative px-5 pt-5 pb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Empezando con Gesto</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {completados} de {total} {completados === 1 ? 'paso completado' : 'pasos completados'}
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors"
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
          const Icon = paso.icon;
          return (
            <Link
              key={paso.href}
              href={paso.href}
              className={cn(
                'flex items-center gap-3 px-2.5 py-2.5 rounded-lg group transition-all',
                paso.done
                  ? 'opacity-50 hover:opacity-70'
                  : 'hover:bg-white/[0.04]',
              )}
            >
              {/* Checkbox */}
              <div className={cn(
                'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                paso.done
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground/30 group-hover:border-primary/60',
              )}>
                {paso.done && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
              </div>

              {/* Icono + texto */}
              <Icon className={cn(
                'h-4 w-4 shrink-0',
                paso.done ? 'text-muted-foreground' : 'text-primary',
              )} strokeWidth={1.75} />

              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-[13px] font-medium',
                  paso.done && 'line-through text-muted-foreground',
                )}>
                  {paso.label}
                </p>
                <p className="text-[11px] text-muted-foreground/70 leading-tight">
                  {paso.descripcion}
                </p>
              </div>

              {!paso.done && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
