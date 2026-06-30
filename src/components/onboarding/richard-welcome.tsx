'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { RichardAvatar } from './richard-avatar';
import { RICHARD, ONBOARDING_POR_PLAN } from '@/lib/onboarding';
import type { PlanId } from '@/lib/planes';

/**
 * Bienvenida de Richard: aparece una sola vez (primer ingreso del tenant) como
 * overlay a pantalla completa. Saluda con el nombre del negocio y propone
 * empezar. Se descarta a localStorage por tenant — no vuelve a aparecer.
 */
export function RichardWelcome({
  negocio,
  firstName,
  plan,
  tenantId,
  yaCompletado,
}: {
  negocio: string;
  firstName: string | null;
  plan: PlanId;
  tenantId: string;
  /** Si el onboarding ya está completo, no tiene sentido la bienvenida. */
  yaCompletado: boolean;
}) {
  const storageKey = `gesto:richard-welcome:${tenantId}`;
  const [visible, setVisible] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    if (yaCompletado) return;
    try {
      if (localStorage.getItem(storageKey) !== 'visto') setVisible(true);
    } catch {
      /* noop */
    }
  }, [storageKey, yaCompletado]);

  function empezar() {
    setSaliendo(true);
    try {
      localStorage.setItem(storageKey, 'visto');
    } catch {
      /* noop */
    }
    setTimeout(() => setVisible(false), 280);
  }

  if (!visible) return null;

  const sub = ONBOARDING_POR_PLAN[plan].bienvenidaSub;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ${
        saliendo ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Backdrop */}
      <button
        aria-label="Cerrar"
        onClick={empezar}
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
      />
      {/* Glow del acento */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 0%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 60%)',
        }}
      />

      <div
        className={`relative w-full max-w-md rounded-2xl border border-border bg-card p-7 text-center shadow-[0_24px_64px_oklch(0_0_0_/_0.45)] transition-all duration-300 ${
          saliendo ? 'translate-y-2 scale-[0.98]' : 'translate-y-0 scale-100'
        }`}
      >
        {/* Avatar de Richard */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl" aria-hidden />
            <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center">
              <RichardAvatar size={56} />
            </div>
          </div>
        </div>

        <p className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">
          <Sparkles className="h-3 w-3" /> Tu asistente en Gesto
        </p>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight leading-tight">
          {firstName ? `¡Hola, ${firstName}!` : '¡Hola!'} Soy {RICHARD.nombre}.
        </h1>

        <p className="mt-3 text-[15px] text-foreground/90 leading-relaxed">
          Vamos a darle a <span className="font-semibold text-primary">{negocio}</span> la
          profesionalidad que se merece.
        </p>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{sub}</p>

        <button
          onClick={empezar}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold glow-primary hover:brightness-105 transition-all"
        >
          ¡Empecemos! <ArrowRight className="h-4 w-4" />
        </button>

        <button
          onClick={empezar}
          className="mt-3 text-[12px] text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          Prefiero explorar solo
        </button>
      </div>
    </div>
  );
}
