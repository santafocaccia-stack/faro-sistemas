import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
// dbAdmin: el webhook no tiene sesión — identifica al tenant por el
// external_reference del preapproval (firma HMAC verificada arriba).
import { dbAdmin } from '@/server/db';
import { tenants } from '@/server/db/schema';
import type { PlanId } from '@/lib/planes';
import { sumarMeses } from '@/lib/fechas';

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!;
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;

/**
 * Verifica la firma del webhook de Mercado Pago (F2).
 *
 * Algoritmo oficial de MP:
 *   - Header `x-signature`: "ts=<timestamp>,v1=<hmac-sha256>"
 *   - Header `x-request-id`
 *   - `data.id` viene del query param (minúsculas si es alfanumérico)
 *   - manifest = `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 *   - HMAC-SHA256(secret, manifest) === v1   (comparación timing-safe)
 */
function verificarFirmaMP(req: NextRequest, secret: string): boolean {
  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id');
  if (!xSignature || !xRequestId) return false;

  let ts: string | undefined;
  let v1: string | undefined;
  for (const parte of xSignature.split(',')) {
    const [clave, valor] = parte.split('=').map((s) => s.trim());
    if (clave === 'ts') ts = valor;
    else if (clave === 'v1') v1 = valor;
  }
  if (!ts || !v1) return false;

  const dataId =
    req.nextUrl.searchParams.get('data.id') ??
    req.nextUrl.searchParams.get('id') ??
    '';

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const esperado = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  // timingSafeEqual exige buffers de igual longitud (si no, lanza)
  const recibidoBuf = Buffer.from(v1, 'hex');
  const esperadoBuf = Buffer.from(esperado, 'hex');
  if (recibidoBuf.length !== esperadoBuf.length) return false;
  return crypto.timingSafeEqual(recibidoBuf, esperadoBuf);
}

export async function POST(req: NextRequest) {
  // F2 — verificación de firma.
  //  - Con secret configurado: se exige firma válida (HMAC timing-safe).
  //  - Sin secret EN PRODUCCIÓN: fail-closed, se rechaza el request. Sin el
  //    secret no hay forma de distinguir un webhook legítimo de MP de un POST
  //    falso, así que procesar sería el agujero de seguridad. Rechazar fuerza a
  //    cargar MP_WEBHOOK_SECRET en Vercel antes de aceptar pagos.
  //  - Sin secret EN DEV: se procesa con warning, para poder testear local.
  if (MP_WEBHOOK_SECRET) {
    if (!verificarFirmaMP(req, MP_WEBHOOK_SECRET)) {
      console.warn('[mp-webhook] firma inválida o ausente — request rechazado');
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    console.error(
      '[mp-webhook] MP_WEBHOOK_SECRET no configurado en producción — request rechazado (fail-closed)',
    );
    return NextResponse.json({ ok: false }, { status: 503 });
  } else {
    console.warn(
      '[mp-webhook] MP_WEBHOOK_SECRET no configurado (dev) — webhook procesado SIN verificación de firma',
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  if (body.type !== 'subscription_preapproval') {
    return NextResponse.json({ ok: true });
  }

  const preapprovalId = body.data?.id;
  if (!preapprovalId) return NextResponse.json({ ok: false }, { status: 400 });

  const res = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
  });

  if (!res.ok) return NextResponse.json({ ok: false }, { status: 500 });

  const preapproval = await res.json();
  const externalRef: string = preapproval.external_reference ?? '';
  const [tenantId, planId] = externalRef.split(':') as [string, PlanId];

  if (!tenantId || !planId) return NextResponse.json({ ok: false }, { status: 400 });

  if (preapproval.status === 'authorized') {
    // Encadenar desde el vencimiento vigente (no perder días si paga antes de
    // vencer) — mismo criterio que el cobro por transferencia.
    const [tenant] = await dbAdmin
      .select({ subscriptionEnd: tenants.subscriptionEnd })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    const ahora = new Date();
    const base =
      tenant?.subscriptionEnd && tenant.subscriptionEnd > ahora ? tenant.subscriptionEnd : ahora;
    const subscriptionEnd = sumarMeses(base, 1);

    await dbAdmin
      .update(tenants)
      .set({
        status: 'activo',
        plan: planId,
        mpSubscriptionId: preapprovalId,
        subscriptionEnd,
      })
      .where(eq(tenants.id, tenantId));
  } else if (preapproval.status === 'cancelled' || preapproval.status === 'paused') {
    await dbAdmin
      .update(tenants)
      .set({ status: 'suspendido' })
      .where(eq(tenants.id, tenantId));
  }

  return NextResponse.json({ ok: true });
}
