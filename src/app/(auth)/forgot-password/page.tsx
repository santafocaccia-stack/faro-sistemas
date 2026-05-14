'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div className="animate-fade-up">
      {/* Logo */}
      <div className="flex items-center justify-center mb-8">
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

        {sent ? (
          /* Estado enviado */
          <div className="text-center py-2">
            <div className="h-12 w-12 rounded-2xl bg-success/10 border border-success/20 mx-auto mb-4 flex items-center justify-center">
              <svg className="h-5 w-5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                <path d="m16 19 2 2 4-4" />
              </svg>
            </div>
            <h2 className="text-base font-semibold tracking-tight mb-1">Revisá tu email</h2>
            <p className="text-sm text-muted-foreground mb-1">
              Si <span className="text-foreground font-medium">{email}</span> tiene una cuenta, vas a recibir un enlace para restablecer tu contraseña.
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              El enlace expira en 1 hora. Revisá la carpeta de spam si no aparece.
            </p>
          </div>
        ) : (
          /* Formulario */
          <>
            <div className="mb-6">
              <h1 className="text-xl font-semibold tracking-tight">Olvidé mi contraseña</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Ingresá tu email y te enviamos un enlace para restablecerla.
              </p>
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
                  autoFocus
                  autoComplete="email"
                  className="h-10 bg-background/40 border-border/60 text-sm"
                />
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full h-10 font-medium glow-primary" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar enlace'}
              </Button>
            </form>
          </>
        )}
      </div>

      {/* Volver */}
      <div className="text-center mt-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}
