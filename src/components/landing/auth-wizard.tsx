'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { PLANES_ARRAY, type PlanId } from '@/lib/planes';
import { PasswordInput } from '@/components/ui/password-input';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  X, ArrowLeft, ArrowRight, Mail, Check,
  ShoppingCart, Wrench, Truck, Scale, Landmark, ChefHat, Store,
} from 'lucide-react';

const PLAN_ICONS: Record<string, React.ElementType> = {
  market: ShoppingCart, servicios: Wrench, atmosfericos: Truck,
  balanza: Scale, prestamista: Landmark, food: ChefHat,
};

/** Clave donde guardamos la versión elegida para que el onboarding la herede. */
export const PLAN_STORAGE_KEY = 'gesto_plan_elegido';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Si viene una versión (CTA "Probar Market"), arranca en el paso de cuenta. */
  versionInicial?: PlanId | null;
};

export function AuthWizard({ open, onClose, versionInicial = null }: Props) {
  const [paso, setPaso] = useState<1 | 2>(versionInicial ? 2 : 1);
  const [plan, setPlan] = useState<PlanId | null>(versionInicial);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  if (!open) return null;

  const disponibles = PLANES_ARRAY.filter((p) => !p.proximamente);
  const planActual = PLANES_ARRAY.find((p) => p.id === plan);

  function guardarPlan() {
    if (plan) { try { localStorage.setItem(PLAN_STORAGE_KEY, plan); } catch { /* noop */ } }
  }

  function elegir(p: PlanId) {
    setPlan(p);
    setError('');
    setPaso(2);
  }

  async function conGoogle() {
    setError('');
    guardarPlan();
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
    if (error) setError('No se pudo iniciar con Google. Probá con tu email.');
  }

  async function conEmail(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (!acepta) { setError('Tenés que aceptar los Términos y la Política de Privacidad.'); return; }

    setLoading(true);
    guardarPlan();
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      setError(
        msg.includes('already') || msg.includes('registered')
          ? 'Ya existe una cuenta con ese email. Probá iniciar sesión.'
          : error.message,
      );
      setLoading(false);
      return;
    }
    if (!data.session) { setEmailSent(true); return; }
    window.location.assign('/onboarding');
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-background w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background z-10">
          <div className="flex items-center gap-2">
            {paso === 2 && !emailSent && !versionInicial && (
              <button
                onClick={() => setPaso(1)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Volver"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <span className="font-semibold">
              {emailSent ? 'Revisá tu email' : paso === 1 ? 'Empezá gratis' : 'Creá tu cuenta'}
            </span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pantalla "revisá tu email" */}
        {emailSent ? (
          <div className="p-6 text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mx-auto mb-4 flex items-center justify-center">
              <Mail className="h-6 w-6 text-primary" strokeWidth={1.75} />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Te enviamos un link de confirmación a <span className="text-foreground font-medium">{email}</span>.
              Hacé click para activar tu cuenta y terminar de configurar tu negocio.
            </p>
            <p className="text-xs text-muted-foreground/60 mt-3">¿No llegó? Revisá la carpeta de spam.</p>
            <Button variant="outline" className="mt-5 w-full" onClick={onClose}>Entendido</Button>
          </div>
        ) : paso === 1 ? (
          /* ── Paso 1: elegir versión ── */
          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-3">¿Qué tipo de negocio tenés?</p>
            <div className="space-y-2">
              {disponibles.map((p) => {
                const Icon = PLAN_ICONS[p.id] ?? Store;
                return (
                  <button
                    key={p.id}
                    onClick={() => elegir(p.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary hover:bg-muted/40 transition-colors text-left group"
                  >
                    <span
                      className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${p.color.replace(')', ' / 0.14)')}`, color: p.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold">{p.nombre.replace('Gesto ', '')}</span>
                      <span className="block text-xs text-muted-foreground truncate">{p.descripcion}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4">
              ¿Ya tenés cuenta?{' '}
              <Link href="/login" className="text-foreground hover:text-primary font-medium">Ingresar</Link>
            </p>
          </div>
        ) : (
          /* ── Paso 2: crear cuenta ── */
          <div className="p-5">
            {planActual && (
              <div className="flex items-center gap-2 mb-4 text-xs">
                <span className="text-muted-foreground">Versión elegida:</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  <Check className="h-3 w-3" /> {planActual.nombre.replace('Gesto ', '')}
                </span>
              </div>
            )}

            <Button variant="outline" className="w-full h-11 gap-2" onClick={conGoogle}>
              <GoogleIcon /> Continuar con Google
            </Button>

            <div className="flex items-center gap-3 my-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide">o con tu email</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={conEmail} className="space-y-3">
              <Input
                type="email" placeholder="tu@email.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                className="h-10 text-sm"
              />
              <PasswordInput
                placeholder="Contraseña (mín. 8)" value={password}
                onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password"
                className="h-10 text-sm"
              />
              <PasswordInput
                placeholder="Repetí la contraseña" value={confirm}
                onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password"
                className="h-10 text-sm"
              />

              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Acepto los{' '}
                  <Link href="/legal/terminos" target="_blank" className="text-foreground hover:text-primary underline underline-offset-2">Términos</Link>{' '}
                  y la{' '}
                  <Link href="/legal/privacidad" target="_blank" className="text-foreground hover:text-primary underline underline-offset-2">Política de Privacidad</Link>.
                </span>
              </label>

              <Button type="submit" className="w-full h-11 font-medium glow-primary" disabled={loading || !acepta}>
                {loading ? 'Creando cuenta...' : 'Crear cuenta · 14 días gratis'}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-4">
              ¿Ya tenés cuenta?{' '}
              <Link href="/login" className="text-foreground hover:text-primary font-medium">Ingresar</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
