/**
 * Auth Callback — exchange del código PKCE que Supabase pone en la URL
 * cuando el usuario hace click en un email de confirmación/reset/invite.
 *
 * Flujo:
 *  1. Supabase envía email con link → `https://proyecto.supabase.co/auth/v1/verify?...&redirect_to=https://app.com/auth/callback?next=/reset-password`
 *  2. Supabase redirige aquí con `?code=xxx&next=/reset-password`
 *  3. Este handler intercambia el code por una sesión válida
 *  4. Redirige al usuario a `next` (ej: /reset-password) ya autenticado
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Si algo salió mal, volver al login con error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
