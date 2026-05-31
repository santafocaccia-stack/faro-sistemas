/**
 * GET /api/cron/reporte-semanal
 *
 * Invocado por Vercel Cron cada lunes a las 10am ARG (13:00 UTC).
 * Envía un resumen de la semana anterior a cada dueño de negocio activo.
 *
 * Protegido con CRON_SECRET para que no sea invocable públicamente.
 * RESEND_API_KEY debe estar configurado en las variables de entorno.
 */
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { tenants, users, usersTenants, ventas, ventasLineas, productos } from '@/server/db/schema';
import { buildReporteSemanalHtml, semanaLabel } from '@/lib/email/reporte-semanal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function tz(d: Date) {
  // Convierte a zona argentina para comparaciones de fecha
  return new Date(d.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
}

export async function GET(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn('[cron/reporte-semanal] RESEND_API_KEY no configurado — omitiendo envío');
    return NextResponse.json({ ok: true, enviados: 0, motivo: 'RESEND_API_KEY no configurado' });
  }
  const resend = new Resend(resendKey);

  // ── Rango: semana anterior (lunes a domingo en ARG) ──────────────────────────
  const ahora = tz(new Date());
  const diasDesdeHoy = ahora.getDay() === 0 ? 7 : ahora.getDay(); // si es domingo, retroceder 7
  const lunes = new Date(ahora);
  lunes.setDate(ahora.getDate() - diasDesdeHoy - 6); // lunes de la semana anterior
  lunes.setHours(0, 0, 0, 0);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  domingo.setHours(23, 59, 59, 999);

  const label = semanaLabel(lunes, domingo);

  // ── Tenants activos ───────────────────────────────────────────────────────────
  const tenantsActivos = await db
    .select({
      id:     tenants.id,
      nombre: tenants.nombre,
      plan:   tenants.plan,
    })
    .from(tenants)
    .where(
      and(
        inArray(tenants.status, ['activo', 'trial']),
        sql`${tenants.deletedAt} is null`,
      )
    );

  if (tenantsActivos.length === 0) {
    return NextResponse.json({ ok: true, enviados: 0 });
  }

  const tenantIds = tenantsActivos.map((t) => t.id);

  // ── Emails de owners ──────────────────────────────────────────────────────────
  const ownerRows = await db
    .select({
      tenantId: usersTenants.tenantId,
      email:    users.email,
    })
    .from(usersTenants)
    .innerJoin(users, eq(users.id, usersTenants.userId))
    .where(
      and(
        inArray(usersTenants.tenantId, tenantIds),
        eq(usersTenants.rol, 'owner'),
      )
    );

  const ownerByTenant = Object.fromEntries(ownerRows.map((r) => [r.tenantId, r.email]));

  // ── Datos de ventas por tenant ────────────────────────────────────────────────
  const ventasRows = await db
    .select({
      tenantId:       ventas.tenantId,
      cantidad:       sql<number>`count(*)::int`,
      total:          sql<number>`coalesce(sum(${ventas.total}), 0)::numeric`,
      ticketPromedio: sql<number>`coalesce(avg(${ventas.total}), 0)::numeric`,
    })
    .from(ventas)
    .where(
      and(
        inArray(ventas.tenantId, tenantIds),
        gte(ventas.fecha, lunes),
        sql`${ventas.fecha} <= ${domingo}`,
        sql`${ventas.estado} != 'anulada'`,
      )
    )
    .groupBy(ventas.tenantId);

  const topProductosRows = await db
    .select({
      tenantId:     ventasLineas.tenantId,
      nombre:       productos.nombre,
      totalMonto:   sql<number>`coalesce(sum(${ventasLineas.subtotal}), 0)::numeric`,
      totalCantidad:sql<number>`coalesce(sum(${ventasLineas.cantidad}), 0)::numeric`,
    })
    .from(ventasLineas)
    .innerJoin(
      ventas,
      and(
        eq(ventasLineas.ventaId, ventas.id),
        gte(ventas.fecha, lunes),
        sql`${ventas.fecha} <= ${domingo}`,
        sql`${ventas.estado} != 'anulada'`,
      )
    )
    .leftJoin(productos, eq(ventasLineas.productoId, productos.id))
    .where(inArray(ventasLineas.tenantId, tenantIds))
    .groupBy(ventasLineas.tenantId, ventasLineas.productoId, productos.nombre)
    .orderBy(sql`sum(${ventasLineas.subtotal}) desc`);

  // ── Enviar emails ─────────────────────────────────────────────────────────────
  let enviados = 0;
  const errores: string[] = [];

  for (const tenant of tenantsActivos) {
    const ownerEmail = ownerByTenant[tenant.id];
    if (!ownerEmail) continue;

    const venta = ventasRows.find((v) => v.tenantId === tenant.id);
    const topP = topProductosRows
      .filter((p) => p.tenantId === tenant.id)
      .slice(0, 5)
      .map((p) => ({
        nombre:        p.nombre,
        totalMonto:    Number(p.totalMonto),
        totalCantidad: Number(p.totalCantidad),
      }));

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://faro-sistemas-gold.vercel.app';

    const html = buildReporteSemanalHtml({
      negocioNombre:  tenant.nombre,
      ventasTotales:  Number(venta?.total ?? 0),
      cantidadVentas: venta?.cantidad ?? 0,
      ticketPromedio: Number(venta?.ticketPromedio ?? 0),
      topProductos:   topP,
      porMetodo:      [],   // simplificado — no cargamos pagos en este pasada
      semanaLabel:    label,
    }).replace('{{APP_URL}}', appUrl);

    try {
      await resend.emails.send({
        from:    'Gesto <noreply@usegesto.app>',
        to:      ownerEmail,
        subject: `📊 Tu semana en Gesto — ${label}`,
        html,
      });
      enviados++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errores.push(`${tenant.nombre}: ${msg}`);
      console.error(`[cron/reporte-semanal] Error enviando a ${ownerEmail}:`, err);
    }
  }

  return NextResponse.json({
    ok:       true,
    semana:   label,
    enviados,
    total:    tenantsActivos.length,
    errores:  errores.length > 0 ? errores : undefined,
  });
}
