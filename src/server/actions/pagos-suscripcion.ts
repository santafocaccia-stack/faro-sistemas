'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/server/auth/session';
import { requireSuperAdmin } from '@/server/auth/super-admin';
import { db } from '@/server/db';
import { tenants, users, usersTenants, pagosSuscripcion } from '@/server/db/schema';
import { PLANES, type PlanId } from '@/lib/planes';
import { getDolarMep } from '@/lib/dolar';
import { getAppUrl } from '@/lib/app-url';
import { montoArsPlan } from '@/lib/transferencia';
import { sumarMeses } from '@/lib/fechas';
import { enviarEmail } from '@/lib/email/enviar';
import {
  buildAvisoTransferenciaAdminHtml,
  buildPagoAvisadoClienteHtml,
  buildPagoConfirmadoClienteHtml,
} from '@/lib/email/suscripcion';

type Result = { ok: boolean; error?: string };

/** Suma un mes calendario (clampeando fin de mes; mismo criterio que el webhook MP). */
function masUnMes(base: Date): Date {
  return sumarMeses(base, 1);
}

/** Comprobante legible a partir del uuid del pago. */
function comprobanteId(pagoId: string): string {
  return `GES-${pagoId.slice(0, 8).toUpperCase()}`;
}

/** Email del owner de un tenant (para mandarle comprobantes). */
async function emailOwner(tenantId: string): Promise<string | null> {
  const [row] = await db
    .select({ email: users.email })
    .from(usersTenants)
    .innerJoin(users, eq(users.id, usersTenants.userId))
    .where(and(eq(usersTenants.tenantId, tenantId), eq(usersTenants.rol, 'owner')))
    .limit(1);
  return row?.email ?? null;
}

const SUPER_ADMINS = (process.env.SUPER_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean);

/**
 * CLIENTE — "Ya transferí". Registra el aviso (NO activa nada) y notifica al
 * super-admin para que confirme. Si ya hay un aviso pendiente, lo refresca.
 */
export async function avisarTransferencia(planId: PlanId): Promise<Result> {
  try {
    if (!(planId in PLANES)) return { ok: false, error: 'Plan inválido' };
    const session = await requireSession({ allowExpired: true });

    const dolarMep = await getDolarMep();
    const montoArs = montoArsPlan(planId, dolarMep);
    const plan = PLANES[planId];

    // ¿Ya hay un aviso pendiente para este tenant? Evitar duplicados.
    const [pendiente] = await db
      .select({ id: pagosSuscripcion.id })
      .from(pagosSuscripcion)
      .where(and(eq(pagosSuscripcion.tenantId, session.tenantId), eq(pagosSuscripcion.estado, 'avisado')))
      .limit(1);

    if (pendiente) {
      await db
        .update(pagosSuscripcion)
        .set({
          plan: planId,
          precioUsd: String(plan.precioUsd),
          dolarMep: String(dolarMep),
          montoArs: String(montoArs),
          avisadoEn: new Date(),
        })
        .where(eq(pagosSuscripcion.id, pendiente.id));
    } else {
      await db.insert(pagosSuscripcion).values({
        tenantId: session.tenantId,
        plan: planId,
        estado: 'avisado',
        precioUsd: String(plan.precioUsd),
        dolarMep: String(dolarMep),
        montoArs: String(montoArs),
      });
    }

    // Notificaciones (no bloquean el resultado si el email falla / no hay key).
    const appUrl = getAppUrl();
    const datos = { negocioNombre: session.tenantNombre, planNombre: plan.nombre, montoArs, appUrl };

    if (SUPER_ADMINS.length > 0) {
      await enviarEmail({
        to: SUPER_ADMINS,
        subject: `💸 ${session.tenantNombre} avisó una transferencia (${plan.nombre})`,
        html: buildAvisoTransferenciaAdminHtml({ ...datos, emailCliente: session.email }),
        replyTo: session.email,
      });
    }
    await enviarEmail({
      to: session.email,
      subject: 'Recibimos tu transferencia — Gesto',
      html: buildPagoAvisadoClienteHtml(datos),
    });

    revalidatePath('/admin/suscripciones');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo registrar el aviso' };
  }
}

/**
 * SUPER-ADMIN — confirma un pago avisado: activa el tenant, extiende el
 * vencimiento un mes desde max(hoy, vencimiento actual) y manda el comprobante.
 */
export async function confirmarPago(pagoId: string): Promise<Result> {
  try {
    const admin = await requireSuperAdmin();

    const [pago] = await db
      .select()
      .from(pagosSuscripcion)
      .where(eq(pagosSuscripcion.id, pagoId))
      .limit(1);

    if (!pago) return { ok: false, error: 'Pago no encontrado' };
    if (pago.estado === 'confirmado') return { ok: false, error: 'Este pago ya estaba confirmado' };

    const [tenant] = await db
      .select({ nombre: tenants.nombre, subscriptionEnd: tenants.subscriptionEnd })
      .from(tenants)
      .where(eq(tenants.id, pago.tenantId))
      .limit(1);
    if (!tenant) return { ok: false, error: 'Negocio no encontrado' };

    const ahora = new Date();
    const base = tenant.subscriptionEnd && tenant.subscriptionEnd > ahora ? tenant.subscriptionEnd : ahora;
    const periodoHasta = masUnMes(base);

    await db.transaction(async (tx) => {
      await tx
        .update(pagosSuscripcion)
        .set({
          estado: 'confirmado',
          confirmadoEn: ahora,
          confirmadoPor: admin.email,
          periodoDesde: base,
          periodoHasta,
        })
        .where(eq(pagosSuscripcion.id, pagoId));

      await tx
        .update(tenants)
        .set({ status: 'activo', plan: pago.plan, subscriptionEnd: periodoHasta })
        .where(eq(tenants.id, pago.tenantId));
    });

    const owner = await emailOwner(pago.tenantId);
    if (owner) {
      await enviarEmail({
        to: owner,
        subject: '✅ Pago confirmado — tu cuenta de Gesto está activa',
        html: buildPagoConfirmadoClienteHtml({
          negocioNombre: tenant.nombre,
          planNombre: PLANES[pago.plan].nombre,
          montoArs: Number(pago.montoArs),
          appUrl: getAppUrl(),
          vence: periodoHasta,
          comprobanteId: comprobanteId(pago.id),
        }),
      });
    }

    revalidatePath('/admin/suscripciones');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo confirmar el pago' };
  }
}

/** SUPER-ADMIN — descarta un aviso de transferencia (no se encontró la plata). */
export async function rechazarPago(pagoId: string, motivo?: string): Promise<Result> {
  try {
    await requireSuperAdmin();
    const [pago] = await db
      .select({ estado: pagosSuscripcion.estado })
      .from(pagosSuscripcion)
      .where(eq(pagosSuscripcion.id, pagoId))
      .limit(1);
    if (!pago) return { ok: false, error: 'Pago no encontrado' };
    if (pago.estado === 'confirmado') return { ok: false, error: 'No se puede rechazar un pago ya confirmado' };

    await db
      .update(pagosSuscripcion)
      .set({ estado: 'rechazado', notas: motivo ?? null })
      .where(eq(pagosSuscripcion.id, pagoId));

    revalidatePath('/admin/suscripciones');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo rechazar' };
  }
}

/**
 * SUPER-ADMIN — activación manual de un tenant (cobré por afuera, sin aviso).
 * Crea un pago ya confirmado y extiende el vencimiento un mes.
 */
export async function activarManual(tenantId: string, planId: PlanId): Promise<Result> {
  try {
    if (!(planId in PLANES)) return { ok: false, error: 'Plan inválido' };
    const admin = await requireSuperAdmin();

    const [tenant] = await db
      .select({ nombre: tenants.nombre, subscriptionEnd: tenants.subscriptionEnd })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    if (!tenant) return { ok: false, error: 'Negocio no encontrado' };

    const dolarMep = await getDolarMep();
    const montoArs = montoArsPlan(planId, dolarMep);
    const plan = PLANES[planId];

    const ahora = new Date();
    const base = tenant.subscriptionEnd && tenant.subscriptionEnd > ahora ? tenant.subscriptionEnd : ahora;
    const periodoHasta = masUnMes(base);

    let pagoId = '';
    await db.transaction(async (tx) => {
      const [nuevo] = await tx
        .insert(pagosSuscripcion)
        .values({
          tenantId,
          plan: planId,
          estado: 'confirmado',
          precioUsd: String(plan.precioUsd),
          dolarMep: String(dolarMep),
          montoArs: String(montoArs),
          periodoDesde: base,
          periodoHasta,
          confirmadoEn: ahora,
          confirmadoPor: admin.email,
          notas: 'Activación manual',
        })
        .returning({ id: pagosSuscripcion.id });
      pagoId = nuevo!.id;

      await tx
        .update(tenants)
        .set({ status: 'activo', plan: planId, subscriptionEnd: periodoHasta })
        .where(eq(tenants.id, tenantId));
    });

    const owner = await emailOwner(tenantId);
    if (owner) {
      await enviarEmail({
        to: owner,
        subject: '✅ Pago confirmado — tu cuenta de Gesto está activa',
        html: buildPagoConfirmadoClienteHtml({
          negocioNombre: tenant.nombre,
          planNombre: plan.nombre,
          montoArs,
          appUrl: getAppUrl(),
          vence: periodoHasta,
          comprobanteId: comprobanteId(pagoId),
        }),
      });
    }

    revalidatePath('/admin/suscripciones');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo activar' };
  }
}
