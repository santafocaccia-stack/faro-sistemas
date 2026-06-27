'use server';

import { and, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { cobrosMp } from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requireSession } from '@/server/auth/session';
import { getMPNegocioToken } from '@/server/mp/token';
import { crearPreferenceCobro } from '@/server/mp/cobro';
import { sincronizarCobro, type CobroEstado } from '@/server/mp/cobro-service';
import { getAppUrl } from '@/lib/app-url';
import QRCode from 'qrcode';

/** ¿El negocio tiene Mercado Pago conectado? (para mostrar/ocultar el método). */
export async function mpConectado(): Promise<boolean> {
  const session = await requireSession();
  const token = await getMPNegocioToken(session.tenantId);
  return !!token;
}

export type IniciarCobroResult =
  | { ok: true; cobroId: string; initPoint: string; qrDataUrl: string }
  | { ok: false; error: string };

/**
 * Crea un cobro y su preference de Checkout Pro. Devuelve el init_point para
 * renderizar el QR. El cobro arranca 'pendiente'; el polling/webhook lo cierran.
 */
export async function iniciarCobroMP(input: {
  monto: number;
  canal?: 'minorista' | 'mayorista';
}): Promise<IniciarCobroResult> {
  try {
    const session = await requireSession();
    const monto = Number(input.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      return { ok: false, error: 'Monto inválido' };
    }

    const token = await getMPNegocioToken(session.tenantId);
    if (!token) {
      return { ok: false, error: 'El negocio no tiene Mercado Pago conectado. Conectalo en Configuración.' };
    }

    const [cobro] = await db
      .insert(cobrosMp)
      .values({
        tenantId: session.tenantId,
        monto: monto.toFixed(2),
        canal: input.canal ?? 'minorista',
        estado: 'pendiente',
        creadoPor: session.email,
      })
      .returning({ id: cobrosMp.id });

    if (!cobro) return { ok: false, error: 'No se pudo crear el cobro' };

    // El webhook lleva ?cobro=<id> para ubicar el cobro sin necesitar token.
    const notificationUrl = `${getAppUrl()}/api/mp-cobro/webhook?cobro=${cobro.id}`;
    const pref = await crearPreferenceCobro(token, {
      monto,
      titulo: `${session.tenantNombre} — Venta`,
      externalReference: cobro.id,
      notificationUrl,
    });

    await db
      .update(cobrosMp)
      .set({ preferenceId: pref.id, initPoint: pref.initPoint })
      .where(eq(cobrosMp.id, cobro.id));

    // QR generado en el server (no exponemos el link de pago a un tercero).
    const qrDataUrl = await QRCode.toDataURL(pref.initPoint, { margin: 1, width: 320 });

    return { ok: true, cobroId: cobro.id, initPoint: pref.initPoint, qrDataUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo iniciar el cobro' };
  }
}

/** Polling: consulta el estado del cobro contra MP. Solo cobros del propio tenant. */
export async function consultarCobroMP(cobroId: string): Promise<{ estado: CobroEstado }> {
  const session = await requireSession();
  const [cobro] = await db
    .select({ id: cobrosMp.id })
    .from(cobrosMp)
    .where(and(byTenant(session.tenantId, cobrosMp), eq(cobrosMp.id, cobroId)))
    .limit(1);
  if (!cobro) return { estado: 'expirado' };

  const r = await sincronizarCobro(cobroId);
  return { estado: r.estado };
}

/** Cancela un cobro pendiente (el cajero cerró el QR sin pagar). */
export async function cancelarCobroMP(cobroId: string): Promise<void> {
  const session = await requireSession();
  await db
    .update(cobrosMp)
    .set({ estado: 'cancelado', updatedAt: new Date() })
    .where(and(
      byTenant(session.tenantId, cobrosMp),
      eq(cobrosMp.id, cobroId),
      eq(cobrosMp.estado, 'pendiente'),
    ));
}

/** Asocia la venta recién registrada al cobro aprobado (para trazabilidad). */
export async function vincularVentaACobro(cobroId: string, ventaId: string): Promise<void> {
  const session = await requireSession();
  await db
    .update(cobrosMp)
    .set({ ventaId, updatedAt: new Date() })
    .where(and(byTenant(session.tenantId, cobrosMp), eq(cobrosMp.id, cobroId)));
}
