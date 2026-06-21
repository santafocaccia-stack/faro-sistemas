/**
 * GET /api/mp-oauth/start
 *
 * Inicia el flujo OAuth para conectar la cuenta de Mercado Pago del negocio.
 * Genera un `state` aleatorio (anti-CSRF), lo guarda en una cookie httpOnly y
 * redirige a la autorización de MP. El callback verifica que el `state` que
 * vuelve coincida con la cookie — sin esto, un atacante podría vincular SU
 * cuenta de MP al negocio de la víctima (redirección de cobros).
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { getAppUrl } from '@/lib/app-url';
import { getUrlConectarMP } from '@/lib/mp-url';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${getAppUrl()}/login`);

  const state = crypto.randomBytes(16).toString('hex');
  const cookieStore = await cookies();
  cookieStore.set('mp_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 min para completar el flujo
  });

  return NextResponse.redirect(getUrlConectarMP(state));
}
