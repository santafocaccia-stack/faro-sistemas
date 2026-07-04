/**
 * Helper server-only para obtener el access token OAuth de Mercado Pago del
 * negocio (con refresh automático). Devuelve un secreto de alto valor.
 *
 * SEGURIDAD: este módulo NO lleva `'use server'`, así que NO es un endpoint HTTP
 * invocable. Solo puede llamarse desde otro código de servidor (server actions o
 * route handlers) que ya validó la sesión y derivó el `tenantId` de ella —
 * nunca con un `tenantId` provisto por el cliente. Antes vivía en un archivo
 * `'use server'`, lo que lo exponía como action sin auth (IDOR de credenciales).
 */
// No lleva `'use server'`: al importar `@/server/db` ya es inherentemente
// server-side y no puede entrar en un bundle de cliente.
import { eq } from 'drizzle-orm';
import { withTenant } from '@/server/db';
import { tenants } from '@/server/db/schema';
import { cifrarToken, descifrarToken } from '@/server/mp/cifrado';

const MP_APP_ID = process.env.MP_APP_ID!;
const MP_SECRET = process.env.MP_CLIENT_SECRET!;

export async function getMPNegocioToken(tenantId: string): Promise<string | null> {
  const [tenant] = await withTenant(tenantId, (db) =>
    db
      .select({
        accessToken:  tenants.mpNegocioAccessToken,
        refreshToken: tenants.mpNegocioRefreshToken,
        expiry:       tenants.mpNegocioTokenExpiry,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1),
  );

  if (!tenant?.accessToken) return null;

  // Cifrados at-rest (los valores legado en texto plano se leen igual).
  const accessToken = descifrarToken(tenant.accessToken);
  const refreshToken = descifrarToken(tenant.refreshToken);

  // Renovar si vence en menos de 5 minutos
  const venceProonto = tenant.expiry && tenant.expiry.getTime() - Date.now() < 5 * 60 * 1000;
  if (!venceProonto) return accessToken;

  if (!refreshToken) return null;

  const res = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     MP_APP_ID,
      client_secret: MP_SECRET,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  });

  if (!res.ok) return accessToken;

  const nuevo = await res.json();
  const expiry = new Date(Date.now() + nuevo.expires_in * 1000);

  await withTenant(tenantId, (db) =>
    db
      .update(tenants)
      .set({
        mpNegocioAccessToken:  cifrarToken(nuevo.access_token),
        mpNegocioRefreshToken: cifrarToken(nuevo.refresh_token ?? refreshToken),
        mpNegocioTokenExpiry:  expiry,
      })
      .where(eq(tenants.id, tenantId)),
  );

  return nuevo.access_token;
}
