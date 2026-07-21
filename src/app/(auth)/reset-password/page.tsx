'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { GestoLogo } from '@/components/brand/gesto-logo';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="animate-fade-up">
      {/* Logo */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center gap-2.5">
          <GestoLogo markColor="var(--gesto-brand)" style={{ height: 28, width: 'auto' }} />
        </div>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-border bg-card/80 backdrop-blur-xl p-7 shadow-[0_0_0_1px_oklch(1_0_0_/_0.04),0_24px_64px_oklch(0_0_0_/_0.4)]">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Nueva contraseña</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Elegí una contraseña segura para tu cuenta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
              Nueva contraseña
            </label>
            <PasswordInput
              id="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              autoComplete="new-password"
              className="h-10 bg-background/40 border-border/60 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirm" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
              Confirmar contraseña
            </label>
            <PasswordInput
              id="confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className="h-10 bg-background/40 border-border/60 text-sm"
            />
            {/* Indicador de fuerza visual */}
            {password.length > 0 && (
              <div className="flex gap-1 pt-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-0.5 flex-1 rounded-full transition-colors"
                    style={{
                      background: password.length >= ([4, 6, 8, 12][i] ?? 0)
                        ? password.length >= 12 ? '#22c55e'
                          : password.length >= 8 ? '#f59e0b'
                          : '#ef4444'
                        : 'oklch(1 0 0 / 0.10)',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-10 font-medium glow-primary"
            disabled={loading || password.length < 8 || password !== confirm}
          >
            {loading ? 'Actualizando...' : 'Actualizar contraseña'}
          </Button>
        </form>
      </div>
    </div>
  );
}
