import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { tenants } from '@/server/db/schema';
import type { PlanId } from '@/lib/planes';

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!;

export async function POST(req: NextRequest) {
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
    const subscriptionEnd = new Date();
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);

    await db
      .update(tenants)
      .set({
        status: 'activo',
        plan: planId,
        mpSubscriptionId: preapprovalId,
        subscriptionEnd,
      })
      .where(eq(tenants.id, tenantId));
  } else if (preapproval.status === 'cancelled' || preapproval.status === 'paused') {
    await db
      .update(tenants)
      .set({ status: 'suspendido' })
      .where(eq(tenants.id, tenantId));
  }

  return NextResponse.json({ ok: true });
}
