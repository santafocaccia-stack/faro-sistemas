/**
 * Webhook de cobros con Mercado Pago (Checkout Pro).
 *
 * MP llama a esta URL cuando cambia el estado de un pago. La preference se creó
 * con notification_url=`.../api/mp-cobro/webhook?cobro=<id>`, así que sabemos a
 * qué cobro pertenece sin necesitar el token. NO se confía en el cuerpo: se
 * vuelve a consultar el pago a MP con el token del negocio (ver sincronizarCobro)
 * y se verifica el external_reference. Siempre responde 200 para que MP no entre
 * en loop de reintentos.
 */
import { NextResponse } from 'next/server';
import { sincronizarCobro } from '@/server/mp/cobro-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(req: Request) {
  try {
    const url = new URL(req.url);
    const cobroId = url.searchParams.get('cobro');
    // Solo UUIDs válidos llegan a la DB (los cobros usan uuid v4 no adivinable).
    if (!cobroId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cobroId)) {
      return NextResponse.json({ ok: true });
    }

    // El payment id puede venir en la query (?id=, ?data.id=) o en el body JSON.
    let paymentId =
      url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? undefined;
    if (!paymentId) {
      const body = (await req.json().catch(() => null)) as
        | { data?: { id?: string | number }; id?: string | number }
        | null;
      const raw = body?.data?.id ?? body?.id;
      paymentId = raw != null ? String(raw) : undefined;
    }

    await sincronizarCobro(cobroId, paymentId);
  } catch (e) {
    console.error('[mp-cobro/webhook]', e);
  }
  return NextResponse.json({ ok: true });
}

// MP usa POST; algunos modos de validación pegan GET.
export async function POST(req: Request) {
  return handle(req);
}
export async function GET(req: Request) {
  return handle(req);
}
