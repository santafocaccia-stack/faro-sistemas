/**
 * Cliente de Mercado Pago para COBROS del negocio (Checkout Pro → QR).
 *
 * Server-only (NO 'use server'): se llama desde server actions / route handlers
 * que ya validaron sesión. Recibe el access token OAuth del negocio (ver
 * `src/server/mp/token.ts`) y opera sobre la cuenta de MP de ese negocio: el
 * dinero va directo a ellos.
 */

const MP_API = 'https://api.mercadopago.com';

export type PreferenceCobro = {
  monto: number;
  titulo: string;
  /** Identificador propio (id del cobro) para reconciliar polling + webhook. */
  externalReference: string;
  /** URL pública del webhook (con ?cobro=<id> para ubicar el cobro sin token). */
  notificationUrl: string;
  /** A dónde vuelve el cliente tras pagar/cancelar (opcional). */
  backUrl?: string;
};

export type PreferenceCreada = { id: string; initPoint: string };

/** Crea una preference de Checkout Pro. Devuelve el init_point (URL → QR). */
export async function crearPreferenceCobro(
  token: string,
  p: PreferenceCobro,
): Promise<PreferenceCreada> {
  const body: Record<string, unknown> = {
    items: [
      {
        title: p.titulo,
        quantity: 1,
        unit_price: Number(p.monto),
        currency_id: 'ARS',
      },
    ],
    external_reference: p.externalReference,
    notification_url: p.notificationUrl,
    // El cliente paga desde su app; al aprobar, que vuelva solo.
    auto_return: 'approved',
  };
  if (p.backUrl) {
    body.back_urls = { success: p.backUrl, pending: p.backUrl, failure: p.backUrl };
  }

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    throw new Error(`MP preference ${res.status}: ${detalle.slice(0, 300)}`);
  }

  const data = (await res.json()) as { id: string; init_point?: string; sandbox_init_point?: string };
  const initPoint = data.init_point ?? data.sandbox_init_point;
  if (!initPoint) throw new Error('MP no devolvió init_point');
  return { id: String(data.id), initPoint };
}

export type EstadoPagoMp = {
  id: string;
  status: 'approved' | 'pending' | 'in_process' | 'rejected' | 'cancelled' | string;
  externalReference: string | null;
  monto: number | null;
};

function mapPago(raw: {
  id: number | string;
  status: string;
  external_reference?: string | null;
  transaction_amount?: number | null;
}): EstadoPagoMp {
  return {
    id: String(raw.id),
    status: raw.status,
    externalReference: raw.external_reference ?? null,
    monto: raw.transaction_amount ?? null,
  };
}

/** Trae un pago puntual por id (fuente de verdad para el webhook). */
export async function obtenerPago(token: string, paymentId: string): Promise<EstadoPagoMp | null> {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const raw = await res.json();
  return mapPago(raw);
}

/**
 * Busca el pago más reciente para un external_reference. Lo usa el polling:
 * mientras se muestra el QR, pregunta si ya entró un pago para este cobro.
 */
export async function buscarPagoPorReferencia(
  token: string,
  externalReference: string,
): Promise<EstadoPagoMp | null> {
  const params = new URLSearchParams({
    external_reference: externalReference,
    sort: 'date_created',
    criteria: 'desc',
  });
  const res = await fetch(`${MP_API}/v1/payments/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: Array<Parameters<typeof mapPago>[0]> };
  const first = data.results?.[0];
  return first ? mapPago(first) : null;
}
