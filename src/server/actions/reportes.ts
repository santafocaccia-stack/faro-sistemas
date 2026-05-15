'use server';

import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { ventas, ventasLineas, pagos, productos } from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requireSession } from '@/server/auth/session';

export type Periodo = 'hoy' | 'semana' | 'mes' | 'tres_meses';

function inicioDesde(periodo: Periodo) {
  const tz = `'America/Argentina/Buenos_Aires'`;
  switch (periodo) {
    case 'hoy':        return sql`(NOW() AT TIME ZONE ${sql.raw(tz)})::date`;
    case 'semana':     return sql`(NOW() AT TIME ZONE ${sql.raw(tz)})::date - INTERVAL '6 days'`;
    case 'mes':        return sql`(NOW() AT TIME ZONE ${sql.raw(tz)})::date - INTERVAL '29 days'`;
    case 'tres_meses': return sql`(NOW() AT TIME ZONE ${sql.raw(tz)})::date - INTERVAL '89 days'`;
  }
}

export async function obtenerReporte(periodo: Periodo = 'mes') {
  const session = await requireSession();
  const { tenantId } = session;
  const desde = inicioDesde(periodo);

  const filtroBase = and(
    byTenant(tenantId, ventas),
    sql`${ventas.fecha} >= ${desde}`,
    sql`${ventas.estado} != 'anulada'`,
  );

  const [resumen, porCanal, porMetodo, porDia, topProductos] = await Promise.all([

    // Resumen global
    db.select({
      cantidad:      sql<number>`count(*)::int`,
      total:         sql<number>`coalesce(sum(${ventas.total}), 0)::numeric`,
      ticketPromedio:sql<number>`coalesce(avg(${ventas.total}), 0)::numeric`,
    }).from(ventas).where(filtroBase),

    // Por canal
    db.select({
      canal:    ventas.canal,
      cantidad: sql<number>`count(*)::int`,
      total:    sql<number>`coalesce(sum(${ventas.total}), 0)::numeric`,
    }).from(ventas).where(filtroBase).groupBy(ventas.canal),

    // Por método de pago (de la tabla pagos)
    db.select({
      metodo:   pagos.metodo,
      cantidad: sql<number>`count(*)::int`,
      total:    sql<number>`coalesce(sum(${pagos.monto}), 0)::numeric`,
    })
    .from(pagos)
    .where(
      and(
        byTenant(tenantId, pagos),
        sql`${pagos.fecha} >= ${desde}`,
        sql`${pagos.anuladoAt} is null`,
      )
    )
    .groupBy(pagos.metodo)
    .orderBy(sql`sum(${pagos.monto}) desc`),

    // Ventas por día
    db.select({
      dia:      sql<string>`(${ventas.fecha} AT TIME ZONE 'America/Argentina/Buenos_Aires')::date::text`,
      canal:    ventas.canal,
      cantidad: sql<number>`count(*)::int`,
      total:    sql<number>`coalesce(sum(${ventas.total}), 0)::numeric`,
    }).from(ventas).where(filtroBase)
      .groupBy(
        sql`(${ventas.fecha} AT TIME ZONE 'America/Argentina/Buenos_Aires')::date`,
        ventas.canal,
      )
      .orderBy(sql`(${ventas.fecha} AT TIME ZONE 'America/Argentina/Buenos_Aires')::date desc`),

    // Top 10 productos por monto
    db.select({
      productoId:   ventasLineas.productoId,
      nombre:       productos.nombre,
      totalCantidad:sql<number>`coalesce(sum(${ventasLineas.cantidad}), 0)::numeric`,
      totalMonto:   sql<number>`coalesce(sum(${ventasLineas.subtotal}), 0)::numeric`,
    })
    .from(ventasLineas)
    .innerJoin(ventas, and(eq(ventasLineas.ventaId, ventas.id), filtroBase))
    .leftJoin(productos, eq(ventasLineas.productoId, productos.id))
    .groupBy(ventasLineas.productoId, productos.nombre)
    .orderBy(sql`sum(${ventasLineas.subtotal}) desc`)
    .limit(10),
  ]);

  const min = porCanal.find((r) => r.canal === 'minorista');
  const may = porCanal.find((r) => r.canal === 'mayorista');

  return {
    resumen: {
      cantidad:       resumen[0]?.cantidad ?? 0,
      total:          Number(resumen[0]?.total ?? 0),
      ticketPromedio: Number(resumen[0]?.ticketPromedio ?? 0),
    },
    minorista: { cantidad: min?.cantidad ?? 0, total: Number(min?.total ?? 0) },
    mayorista: { cantidad: may?.cantidad ?? 0, total: Number(may?.total ?? 0) },
    porMetodo:    porMetodo.map((r) => ({ ...r, total: Number(r.total) })),
    porDia,
    topProductos: topProductos.map((r) => ({
      ...r,
      totalCantidad: Number(r.totalCantidad),
      totalMonto:    Number(r.totalMonto),
    })),
  };
}
