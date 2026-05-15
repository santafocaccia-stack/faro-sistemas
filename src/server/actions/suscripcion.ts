'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { requireSession } from '@/server/auth/session';
import { db } from '@/server/db';
import { tenants } from '@/server/db/schema';
import { PLANES, type PlanId } from '@/lib/planes';
import { getDolarMep } from '@/lib/dolar';

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gesto.app';

export async function crearSuscripcionMP(planId: PlanId) {
  const session = await requireSession({ allowExpired: true });
  const plan = PLANES[planId];

  const dolarMep = await getDolarMep();
  const montoArs = Math.round(plan.precioUsd * dolarMep);

  const body = {
    reason: `${plan.nombre} — suscripción mensual`,
    external_reference: `${session.tenantId}:${planId}`,
    payer_email: session.email,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: montoArs,
      currency_id: 'ARS',
    },
    back_url: `${APP_URL}/planes/callback`,
    status: 'pending',
  };

  const res = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error al crear suscripción en Mercado Pago: ${err}`);
  }

  const data = await res.json();

  // Guardar el ID de suscripción en el tenant
  await db
    .update(tenants)
    .set({ mpSubscriptionId: data.id })
    .where(eq(tenants.id, session.tenantId));

  redirect(data.init_point);
}

export async function cancelarSuscripcion() {
  const session = await requireSession();

  const [tenant] = await db
    .select({ mpSubscriptionId: tenants.mpSubscriptionId })
    .from(tenants)
    .where(eq(tenants.id, session.tenantId))
    .limit(1);

  if (!tenant?.mpSubscriptionId) throw new Error('No hay suscripción activa');

  const res = await fetch(
    `https://api.mercadopago.com/preapproval/${tenant.mpSubscriptionId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ status: 'cancelled' }),
    },
  );

  if (!res.ok) throw new Error('Error al cancelar la suscripción');

  await db
    .update(tenants)
    .set({ status: 'cancelado', mpSubscriptionId: null })
    .where(eq(tenants.id, session.tenantId));
}
