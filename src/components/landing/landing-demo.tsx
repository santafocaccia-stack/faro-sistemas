'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Receipt, Check, ArrowRight, Lock, Plus } from 'lucide-react';
import { RUBROS, SOBRE_ACENTO, fmtARS, type DemoItem } from './landing-data';

export function LandingDemo() {
  const [rubroId, setRubroId] = useState(RUBROS[0]!.id);
  const [cart, setCart] = useState<DemoItem[]>([]);
  const [cobrado, setCobrado] = useState(false);

  const rubro = useMemo(() => RUBROS.find((r) => r.id === rubroId)!, [rubroId]);
  const total = cart.reduce((a, c) => a + c.precio, 0);

  function elegirRubro(id: string) {
    setRubroId(id);
    setCart([]);
    setCobrado(false);
  }
  function agregar(item: DemoItem) {
    if (cobrado) {
      setCart([item]);
      setCobrado(false);
    } else {
      setCart((c) => [...c, item]);
    }
  }

  const ac = rubro.acento;

  return (
    <section className="relative overflow-hidden" style={{ ['--ac' as string]: ac }}>
      {/* halo de acento sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-[42rem] max-w-full rounded-full opacity-20 blur-3xl"
        style={{ background: ac }}
      />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-6">
        {/* Nav */}
        <nav className="flex items-center justify-between py-5">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-[10px] font-bold"
              style={{ background: ac, color: SOBRE_ACENTO }}
            >
              G
            </span>
            <span className="font-semibold tracking-tight">Gesto</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Ingresar
            </Link>
            <Link
              href="/signup"
              className="hidden rounded-lg px-3.5 py-2 text-sm font-medium sm:inline-block"
              style={{ background: ac, color: SOBRE_ACENTO }}
            >
              Empezá gratis
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="grid items-center gap-10 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
          {/* Izquierda: copy adaptativo */}
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: ac }}>
              {rubro.eyebrow}
            </p>
            <h1 className="mt-3 text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              {rubro.titulo}
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">{rubro.sub}</p>

            {/* Selector de rubro */}
            <p className="mb-2.5 mt-7 text-xs text-muted-foreground/70">
              ¿Qué tenés? Elegí y mirá cómo se adapta 👇
            </p>
            <div className="flex flex-wrap gap-2">
              {RUBROS.map((r) => {
                const activo = r.id === rubroId;
                return (
                  <button
                    key={r.id}
                    onClick={() => elegirRubro(r.id)}
                    className="rounded-full border px-3.5 py-1.5 text-sm transition-colors"
                    style={
                      activo
                        ? { background: r.acento, borderColor: r.acento, color: SOBRE_ACENTO, fontWeight: 500 }
                        : { borderColor: 'var(--border)', color: 'var(--muted-foreground)' }
                    }
                  >
                    {r.nombre}
                  </button>
                );
              })}
            </div>

            {/* CTA */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium"
                style={{ background: ac, color: SOBRE_ACENTO }}
              >
                Empezá gratis <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#planes"
                className="rounded-xl border border-border bg-card/50 px-5 py-3 text-sm text-foreground/90 transition-colors hover:bg-card"
              >
                Ver planes
              </a>
              <span className="text-xs text-muted-foreground">14 días gratis · sin tarjeta</span>
            </div>
          </div>

          {/* Derecha: demo POS en vivo */}
          <div className="rounded-2xl border border-border bg-card/60 p-3 sm:p-4">
            <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr]">
              {/* Productos */}
              <div className="rounded-xl border border-border bg-background/40 p-3">
                <p className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <ShoppingCart className="h-3.5 w-3.5" style={{ color: ac }} /> {rubro.caja}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {rubro.items.map((it) => (
                    <button
                      key={it.nombre}
                      onClick={() => agregar(it)}
                      className="group rounded-lg border border-border bg-card/60 p-2.5 text-left transition-all hover:-translate-y-0.5"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <span className="flex items-start justify-between gap-1">
                        <span className="text-[12.5px] leading-tight">{it.nombre}</span>
                        <Plus className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: ac }} />
                      </span>
                      <span className="mt-1 block text-[12px] text-muted-foreground">{fmtARS(it.precio)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ticket */}
              <div className="flex flex-col rounded-xl border border-border bg-background/40 p-3">
                <p className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Receipt className="h-3.5 w-3.5" style={{ color: ac }} /> Ticket
                </p>

                <div className="min-h-[104px] flex-1">
                  {cobrado ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <span
                        className="mb-2 flex h-9 w-9 items-center justify-center rounded-full"
                        style={{ background: ac, color: SOBRE_ACENTO }}
                      >
                        <Check className="h-5 w-5" />
                      </span>
                      <p className="text-[13px]">¡Listo! Comprobante generado</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">Así de rápido en Gesto</p>
                    </div>
                  ) : cart.length === 0 ? (
                    <div className="flex h-full items-center justify-center px-2 text-center text-[12px] leading-relaxed text-muted-foreground/70">
                      Tocá un producto para sumarlo
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {cart.map((c, i) => (
                        <div key={i} className="flex justify-between gap-2 text-[12.5px]">
                          <span className="truncate text-foreground/80">{c.nombre}</span>
                          <span>{fmtARS(c.precio)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mb-2.5 mt-2.5 flex items-baseline justify-between border-t border-border pt-2.5">
                  <span className="text-[12px] text-muted-foreground">Total</span>
                  <span className="text-xl font-semibold">{fmtARS(cobrado ? total : total)}</span>
                </div>
                <button
                  onClick={() => cart.length > 0 && setCobrado(true)}
                  disabled={cart.length === 0}
                  className="w-full rounded-lg py-2.5 text-sm font-medium transition-[filter] hover:brightness-110 disabled:opacity-40"
                  style={{ background: ac, color: SOBRE_ACENTO }}
                >
                  {rubro.accion}
                </button>
              </div>
            </div>

            {/* Incluye (adapta al rubro) */}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-1 pt-1">
              {rubro.incluye.map((f) => (
                <span key={f} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <Check className="h-3.5 w-3.5" style={{ color: ac }} /> {f}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* franja de confianza */}
        <p className="flex items-center justify-center gap-1.5 pb-10 text-center text-xs text-muted-foreground/70">
          <Lock className="h-3 w-3" /> Tus datos, tuyos. Multi-tenant con aislamiento por negocio.
        </p>
      </div>
    </section>
  );
}
