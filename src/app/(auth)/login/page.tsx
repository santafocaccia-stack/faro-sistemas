'use client';

import { useState } from 'react';
import Link from 'next/link';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  async function handleGoogle() {
    setLoadingGoogle(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      setError(
        msg.includes('invalid')
          ? 'Email o contraseña incorrectos.'
          : msg.includes('confirm')
          ? 'Todavía no confirmaste tu email. Revisá tu casilla (y la carpeta de spam).'
          : msg.includes('rate') || msg.includes('many')
          ? 'Demasiados intentos. Esperá un momento e intentá de nuevo.'
          : error.message,
      );
      setLoading(false);
      return;
    }

    // Navegación dura: garantiza que el servidor reciba la cookie de sesión
    // recién creada (evita la carrera que dejaba el botón en "Ingresando...").
    window.location.assign('/dashboard');
  }

  return (
    <div className="animate-fade-up">
      {/* Logo + brand (solo mobile; en desktop está el panel de marca) */}
      <div className="flex items-center justify-center mb-8 lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-[10px] bg-gradient-to-br from-primary to-[oklch(0.55_0.18_28)] flex items-center justify-center shadow-[0_0_0_1px_oklch(1_0_0_/_0.08)_inset,0_8px_24px_oklch(0.68_0.19_38_/_0.4)]">
            <span className="text-primary-foreground font-bold text-base leading-none tracking-tight">G</span>
          </div>
          <div className="leading-tight">
            <p className="font-semibold text-base tracking-tight">Gesto</p>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-border bg-card/80 backdrop-blur-xl p-7 shadow-[0_0_0_1px_oklch(1_0_0_/_0.04),0_24px_64px_oklch(0_0_0_/_0.4)]">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">¡Hola de nuevo!</h1>
          <p className="text-sm text-muted-foreground mt-1">Ingresá para seguir gestionando tu negocio.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-10 bg-background/40 border-border/60 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                Contraseña
              </label>
              <Link
                href="/forgot-password"
                className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-10 bg-background/40 border-border/60 text-sm"
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-10 font-medium glow-primary"
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase">
            <span className="bg-card/80 px-2 text-muted-foreground/60 tracking-widest">o</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loadingGoogle}
          className="w-full h-10 flex items-center justify-center gap-2.5 rounded-lg border border-border/60 bg-background/40 text-sm font-medium hover:bg-muted/60 transition-colors disabled:opacity-50"
        >
          <GoogleIcon />
          {loadingGoogle ? 'Redirigiendo...' : 'Continuar con Google'}
        </button>
      </div>

      {/* Link a signup */}
      <p className="text-center text-xs text-muted-foreground mt-6">
        ¿No tenés cuenta?{' '}
        <Link href="/signup" className="text-foreground hover:text-primary transition-colors font-medium">
          Crear una nueva
        </Link>
      </p>

      {/* Pie: legales + ayuda */}
      <div className="mt-8 flex items-center justify-center gap-3 text-[11px] text-muted-foreground/60">
        <Link href="/legal/terminos" className="hover:text-foreground transition-colors">Términos</Link>
        <span aria-hidden>·</span>
        <Link href="/legal/privacidad" className="hover:text-foreground transition-colors">Privacidad</Link>
        <span aria-hidden>·</span>
        <a
          href="mailto:tomasemanueldesousa@gmail.com?subject=Ayuda%20con%20Gesto"
          className="hover:text-foreground transition-colors"
        >
          ¿Necesitás ayuda?
        </a>
      </div>
    </div>
  );
}
