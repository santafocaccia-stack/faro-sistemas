'use client';

import { useState } from 'react';
import Link from 'next/link';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
