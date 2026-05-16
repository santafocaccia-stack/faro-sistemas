'use server';

import { eq } from 'drizzle-orm';
import { requireSession } from '@/server/auth/session';
import { db } from '@/server/db';
import { tenants } from '@/server/db/schema';

const MP_APP_ID    = process.env.MP_APP_ID!;
const MP_SECRET    = process.env.MP_CLIENT_SECRET!;

export async function desconectarMP() {
  const session = await requireSession();
  await db
    .update(tenants)
    .set({
      mpNegocioAccessToken:  null,
      mpNegocioRefreshToken: null,
      mpNegocioTokenExpiry:  null,
      mpNegocioUserId:       null,
    })
    .where(eq(tenants.id, session.tenantId));
}

export async function getMPNegocioToken(tenantId: string): Promise<string | null> {
  const [tenant] = await db
    .select({
      accessToken:  tenants.mpNegocioAccessToken,
      refreshToken: tenants.mpNegocioRefreshToken,
      expiry:       tenants.mpNegocioTokenExpiry,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant?.accessToken) return null;

  // Renovar si vence en menos de 5 minutos
  const venceProonto = tenant.expiry && tenant.expiry.getTime() - Date.now() < 5 * 60 * 1000;
  if (!venceProonto) return tenant.accessToken;

  if (!tenant.refreshToken) return null;

  const res = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     MP_APP_ID,
      client_secret: MP_SECRET,
      refresh_token: tenant.refreshToken,
      grant_type:    'refresh_token',
    }),
  });

  if (!res.ok) return tenant.accessToken;

  const nuevo = await res.json();
  const expiry = new Date(Date.now() + nuevo.expires_in * 1000);

  await db
    .update(tenants)
    .set({
      mpNegocioAccessToken:  nuevo.access_token,
      mpNegocioRefreshToken: nuevo.refresh_token ?? tenant.refreshToken,
      mpNegocioTokenExpiry:  expiry,
    })
    .where(eq(tenants.id, tenantId));

  return nuevo.access_token;
}
