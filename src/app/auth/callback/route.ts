/**
 * Auth Callback — procesa los links que Supabase manda por email
 * (confirmación de cuenta, invitación de equipo, reset de contraseña)
 * y los logins OAuth.
 *
 * Soporta DOS flujos, porque Supabase usa distintos según el caso:
 *
 *  1. PKCE (`?code=...`)
 *     - Lo usa OAuth y el signup iniciado desde este mismo browser.
 *     - Requiere un "code verifier" en cookie, seteado cuando el flujo
 *       arrancó en este dispositivo.
 *
 *  2. Token hash (`?token_hash=...&type=...`)
 *     - Lo usan las invitaciones, el recovery y la confirmación de email.
 *     - NO requiere code verifier → funciona desde cualquier dispositivo.
 *     - Necesita que el template de email apunte acá con token_hash + type.
 *
 * Tras autenticar, redirige a `next` (ej: /reset-password para invitados).
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  // Solo paths internos (defensa anti open-redirect: nada de '//' ni esquemas).
  const nextRaw = searchParams.get('next') ?? '/dashboard';
  const next = nextRaw.startsWith('/') && !nextRaw.startsWith('//') && !nextRaw.includes('\\')
    ? nextRaw
    : '/dashboard';

  const supabase = await createClient();

  // ── Flujo 1: PKCE (OAuth / signup desde este browser) ──────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // ── Flujo 2: token_hash (invitación / recovery / confirmación) ──
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Algo falló — volver al login con error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
