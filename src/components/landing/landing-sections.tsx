import Link from 'next/link';
import { Check, X, NotebookPen, Sparkles } from 'lucide-react';
import { PLANES_ARRAY } from '@/lib/planes';
import { fmtARS } from './landing-data';

/* ── Antes / Después ─────────────────────────────────────────────────────── */
export function AntesDespues() {
  return (
    <section className="border-t border-border/60 bg-card/20">
      <div className="mx-auto max-w-5xl px-5 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">¿Cuánto vendiste hoy?</h2>
          <p className="mt-3 text-muted-foreground">
            La misma pregunta, dos mundos. Gesto cambia el segundo.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {/* Sin Gesto */}
          <div className="rounded-2xl border border-destructive/25 bg-destructive/[0.04] p-6">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
              <NotebookPen className="h-3.5 w-3.5" /> Sin Gesto
            </p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                'Cuaderno, calculadora y a sumar a mano',
                'El fiado en papelitos que se pierden',
                '"¿Cuánto gané?" — ni idea hasta fin de mes',
                'El stock lo sabés cuando te quedás sin nada',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive/70" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Con Gesto */}
          <div className="rounded-2xl border-2 border-primary/40 bg-primary/[0.05] p-6">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Con Gesto
            </p>
            <div className="mb-4 flex items-baseline justify-between rounded-xl border border-border bg-background/40 px-4 py-3">
              <span className="font-mono text-2xl font-semibold">{fmtARS(142300)}</span>
              <span className="text-sm text-muted-foreground">37 ventas hoy</span>
            </div>
            <ul className="space-y-3 text-sm text-foreground/90">
              {[
                'Cobrás con código de barras o por kilo',
                'El fiado de cada cliente, siempre al día',
                'Cuánto vendiste y ganaste, en tiempo real',
                'Stock que se descuenta solo en cada venta',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Planes (precio en USD, cobrado en pesos al MEP) ─────────────────────── */
export function Pricing({ dolarMep }: { dolarMep: number }) {
  return (
    <section id="planes" className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Un plan para tu rubro</h2>
          <p className="mt-3 text-muted-foreground">
            Precios en dólares para no licuarse con la inflación. Pagás en pesos al dólar MEP del día.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLANES_ARRAY.map((plan) => {
            const ars = Math.round(plan.precioUsd * dolarMep);
            return (
              <div
                key={plan.id}
                className="flex flex-col rounded-2xl border border-border bg-card/50 p-6"
                style={{ borderColor: plan.proximamente ? undefined : `${plan.color}` }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold tracking-tight">{plan.nombre}</h3>
                  {plan.proximamente && (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
                      Próximamente
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{plan.descripcion}</p>

                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="text-3xl font-semibold">USD {plan.precioUsd}</span>
                  <span className="text-sm text-muted-foreground">/mes</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">≈ {fmtARS(ars)} por mes</p>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground/85">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: plan.color }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.proximamente ? '/signup' : '/signup'}
                  aria-disabled={plan.proximamente}
                  className="mt-6 rounded-xl px-4 py-2.5 text-center text-sm font-medium transition-colors"
                  style={
                    plan.proximamente
                      ? { background: 'var(--secondary)', color: 'var(--muted-foreground)' }
                      : { background: plan.color, color: '#1a1408' }
                  }
                >
                  {plan.proximamente ? 'Avisame cuando salga' : 'Probar 14 días gratis'}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/70">
          Dólar MEP de referencia: {fmtARS(dolarMep)} · Cancelás cuando quieras, sin permanencia.
        </p>
      </div>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────────────────────────────── */
export function LandingFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            G
          </span>
          <span className="text-sm text-muted-foreground">Gesto · Gestión comercial para PyMEs argentinas</span>
        </div>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/login" className="text-muted-foreground transition-colors hover:text-foreground">
            Ingresar
          </Link>
          <Link href="/signup" className="text-muted-foreground transition-colors hover:text-foreground">
            Crear cuenta
          </Link>
        </div>
      </div>
    </footer>
  );
}
