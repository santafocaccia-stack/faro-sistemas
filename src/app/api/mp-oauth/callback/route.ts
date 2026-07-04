import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { dbAdmin, withTenant } from '@/server/db';
import { tenants, usersTenants } from '@/server/db/schema';
import { cifrarToken } from '@/server/mp/cifrado';
import { getAppUrl } from '@/lib/app-url';

const MP_APP_ID     = process.env.MP_APP_ID!;
const MP_SECRET     = process.env.MP_CLIENT_SECRET!;
const APP_URL       = getAppUrl();
const REDIRECT_URI  = `${APP_URL}/api/mp-oauth/callback`;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  if (error || !code) {
    console.error('[mp-oauth] sin code o con error de MP:', { error, hasCode: !!code });
    return NextResponse.redirect(`${APP_URL}/dashboard/config?mp=error&reason=no_code`);
  }

  // Verificación anti-CSRF: el state debe coincidir con la cookie sembrada en
  // /api/mp-oauth/start. La cookie es single-use: se borra siempre.
  const cookieStore = await cookies();
  const expectedState = cookieStore.get('mp_oauth_state')?.value;
  cookieStore.delete('mp_oauth_state');
  if (!state || !expectedState || state !== expectedState) {
    console.error('[mp-oauth] state mismatch:', { hasState: !!state, hasCookie: !!expectedState });
    return NextResponse.redirect(`${APP_URL}/dashboard/config?mp=error&reason=state`);
  }

  // Obtener el tenant del usuario autenticado
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  // dbAdmin: lookup pre-tenant (resuelve la membresía del usuario autenticado).
  const [membership] = await dbAdmin
    .select({ tenantId: usersTenants.tenantId })
    .from(usersTenants)
    .where(eq(usersTenants.userId, user.id))
    .limit(1);

  if (!membership) return NextResponse.redirect(`${APP_URL}/onboarding`);

  // Intercambiar code por access_token
  const tokenRes = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     MP_APP_ID,
      client_secret: MP_SECRET,
      code,
      grant_type:    'authorization_code',
      redirect_uri:  REDIRECT_URI,
    }),
  });

  if (!tokenRes.ok) {
    // Capturar el detalle del error de MP para diagnóstico (no se expone al cliente).
    const detalle = await tokenRes.text().catch(() => '');
    console.error('[mp-oauth] intercambio de token falló:', tokenRes.status, detalle);
    return NextResponse.redirect(`${APP_URL}/dashboard/config?mp=error&reason=token_${tokenRes.status}`);
  }

  const token = await tokenRes.json();

  const expiry = new Date(Date.now() + token.expires_in * 1000);

  await withTenant(membership.tenantId, (db) =>
    db
      .update(tenants)
      .set({
        mpNegocioAccessToken:  cifrarToken(token.access_token),
        mpNegocioRefreshToken: cifrarToken(token.refresh_token),
        mpNegocioTokenExpiry:  expiry,
        mpNegocioUserId:       String(token.user_id),
      })
      .where(eq(tenants.id, membership.tenantId)),
  );

  return NextResponse.redirect(`${APP_URL}/dashboard/config?mp=ok`);
}
