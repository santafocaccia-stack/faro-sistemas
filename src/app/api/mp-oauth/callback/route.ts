import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/server/db';
import { tenants, usersTenants } from '@/server/db/schema';
import { getAppUrl } from '@/lib/app-url';

const MP_APP_ID     = process.env.MP_APP_ID!;
const MP_SECRET     = process.env.MP_CLIENT_SECRET!;
const APP_URL       = getAppUrl();
const REDIRECT_URI  = `${APP_URL}/api/mp-oauth/callback`;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/dashboard/config?mp=error`);
  }

  // Obtener el tenant del usuario autenticado
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  const [membership] = await db
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
    return NextResponse.redirect(`${APP_URL}/dashboard/config?mp=error`);
  }

  const token = await tokenRes.json();

  const expiry = new Date(Date.now() + token.expires_in * 1000);

  await db
    .update(tenants)
    .set({
      mpNegocioAccessToken:  token.access_token,
      mpNegocioRefreshToken: token.refresh_token,
      mpNegocioTokenExpiry:  expiry,
      mpNegocioUserId:       String(token.user_id),
    })
    .where(eq(tenants.id, membership.tenantId));

  return NextResponse.redirect(`${APP_URL}/dashboard/config?mp=ok`);
}
