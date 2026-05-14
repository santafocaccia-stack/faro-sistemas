'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Si la sesión es null significa que Supabase requiere confirmación de email
    if (!data.session) {
      setEmailSent(true);
      return;
    }

    // Si el email ya estaba confirmado (auto-confirm activo), ir directo al onboarding
    router.push('/onboarding');
    router.refresh();
  }

  // Pantalla de "revisá tu email"
  if (emailSent) {
    return (
      <div className="animate-fade-up text-center">
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-[10px] bg-gradient-to-br from-primary to-[oklch(0.55_0.18_28)] flex items-center justify-center shadow-[0_0_0_1px_oklch(1_0_0_/_0.08)_inset,0_8px_24px_oklch(0.68_0.19_38_/_0.4)]">
              <span className="text-primary-foreground font-bold text-base leading-none tracking-tight">G</span>
            </div>
            <p className="font-semibold text-base tracking-tight">Gesto</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card/80 backdrop-blur-xl p-8 shadow-[0_0_0_1px_oklch(1_0_0_/_0.04),0_24px_64px_oklch(0_0_0_/_0.4)]">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mx-auto mb-4 flex items-center justify-center">
            <Mail className="h-6 w-6 text-primary" strokeWidth={1.75} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight mb-2">Revisá tu email</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Te enviamos un link de confirmación a <span className="text-foreground font-medium">{email}</span>.
            Hacé click en el link para activar tu cuenta.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-4">
            ¿No llegó? Revisá la carpeta de spam.
          </p>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link href="/login" className="text-foreground hover:text-primary transition-colors font-medium">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      {/* Logo + brand */}
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
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Crear cuenta</h1>
          <p className="text-sm text-muted-foreground mt-1">Empezá a gestionar tu negocio en minutos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">Email</label>
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
            <label htmlFor="password" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">Contraseña</label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="h-10 bg-background/40 border-border/60 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirm" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">Confirmar contraseña</label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
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
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        ¿Ya tenés cuenta?{' '}
        <Link href="/login" className="text-foreground hover:text-primary transition-colors font-medium">
          Ingresar
        </Link>
      </p>
    </div>
  );
}
