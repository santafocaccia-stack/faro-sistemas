/**
 * GET /api/cron/reporte-diario
 *
 * Invocado por Vercel Cron cada noche (~22:00 ARG). Envía al dueño un
 * resumen del DÍA que termina: ventas, ticket promedio y top productos.
 * Solo se envía a negocios que tuvieron al menos una venta ese día
 * (para no mandar correos vacíos en días sin actividad).
 *
 * Protegido con CRON_SECRET. Requiere RESEND_API_KEY.
 */
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { tenants, users, usersTenants, ventas, ventasLineas, productos } from '@/server/db/schema';
import { buildReporteSemanalHtml } from '@/lib/email/reporte-semanal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function tz(d: Date) {
  return new Date(d.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ ok: true, enviados: 0, motivo: 'RESEND_API_KEY no configurado' });
  }
  const resend = new Resend(resendKey);

  // Rango: hoy (ARG) 00:00 → 23:59
  const ahora = tz(new Date());
  const inicio = new Date(ahora); inicio.setHours(0, 0, 0, 0);
  const fin = new Date(ahora); fin.setHours(23, 59, 59, 999);
  const label = `${DIAS[ahora.getDay()]} ${ahora.getDate()} de ${MESES[ahora.getMonth()]}`;

  const tenantsActivos = await db
    .select({ id: tenants.id, nombre: tenants.nombre })
    .from(tenants)
    .where(and(inArray(tenants.status, ['activo', 'trial']), sql`${tenants.deletedAt} is null`));
  if (tenantsActivos.length === 0) return NextResponse.json({ ok: true, enviados: 0 });

  const tenantIds = tenantsActivos.map((t) => t.id);

  const ventasRows = await db
    .select({
      tenantId: ventas.tenantId,
      cantidad: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${ventas.total}), 0)::numeric`,
      ticketPromedio: sql<number>`coalesce(avg(${ventas.total}), 0)::numeric`,
    })
    .from(ventas)
    .where(and(
      inArray(ventas.tenantId, tenantIds),
      gte(ventas.fecha, inicio),
      sql`${ventas.fecha} <= ${fin}`,
      sql`${ventas.estado} != 'anulada'`,
    ))
    .groupBy(ventas.tenantId);

  const topProductosRows = await db
    .select({
      tenantId: ventasLineas.tenantId,
      nombre: productos.nombre,
      totalMonto: sql<number>`coalesce(sum(${ventasLineas.subtotal}), 0)::numeric`,
      totalCantidad: sql<number>`coalesce(sum(${ventasLineas.cantidad}), 0)::numeric`,
    })
    .from(ventasLineas)
    .innerJoin(ventas, and(
      eq(ventasLineas.ventaId, ventas.id),
      gte(ventas.fecha, inicio),
      sql`${ventas.fecha} <= ${fin}`,
      sql`${ventas.estado} != 'anulada'`,
    ))
    .leftJoin(productos, eq(ventasLineas.productoId, productos.id))
    .where(inArray(ventasLineas.tenantId, tenantIds))
    .groupBy(ventasLineas.tenantId, ventasLineas.productoId, productos.nombre)
    .orderBy(sql`sum(${ventasLineas.subtotal}) desc`);

  const ownerRows = await db
    .select({ tenantId: usersTenants.tenantId, email: users.email })
    .from(usersTenants)
    .innerJoin(users, eq(users.id, usersTenants.userId))
    .where(and(inArray(usersTenants.tenantId, tenantIds), eq(usersTenants.rol, 'owner')));
  const ownerByTenant = Object.fromEntries(ownerRows.map((r) => [r.tenantId, r.email]));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://faro-sistemas-gold.vercel.app';
  let enviados = 0;

  for (const tenant of tenantsActivos) {
    const venta = ventasRows.find((v) => v.tenantId === tenant.id);
    // Sin ventas hoy → no mandamos correo (evita spam de días muertos)
    if (!venta || venta.cantidad === 0) continue;
    const ownerEmail = ownerByTenant[tenant.id];
    if (!ownerEmail) continue;

    const topP = topProductosRows
      .filter((p) => p.tenantId === tenant.id)
      .slice(0, 5)
      .map((p) => ({ nombre: p.nombre, totalMonto: Number(p.totalMonto), totalCantidad: Number(p.totalCantidad) }));

    const html = buildReporteSemanalHtml({
      negocioNombre: tenant.nombre,
      ventasTotales: Number(venta.total),
      cantidadVentas: venta.cantidad,
      ticketPromedio: Number(venta.ticketPromedio),
      topProductos: topP,
      porMetodo: [],
      semanaLabel: label,
      subtitulo: 'Reporte diario',
      titulo: 'Cómo te fue hoy',
      footerNota: 'Este resumen se envía automáticamente cada noche',
    }).replace('{{APP_URL}}', appUrl);

    try {
      await resend.emails.send({
        from: 'Gesto <noreply@usegesto.app>',
        to: ownerEmail,
        subject: `📊 Tu día en Gesto — ${label}`,
        html,
      });
      enviados++;
    } catch (err) {
      console.error(`[cron/reporte-diario] Error enviando a ${ownerEmail}:`, err);
    }
  }

  return NextResponse.json({ ok: true, dia: label, enviados });
}
