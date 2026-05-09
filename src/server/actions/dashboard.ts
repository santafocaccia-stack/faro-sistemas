'use server';

import { and, eq, gt, isNotNull, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { ventas, clientes, productos } from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requireSession } from '@/server/auth/session';

export async function obtenerKpisDashboard() {
  const session = await requireSession();
  const { tenantId } = session;

  const hoy = sql`(NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date`;

  const [ventasHoy, pendienteCC, stockBajo, ultimasVentas] = await Promise.all([
    // Ventas del día agrupadas por canal
    db
      .select({
        canal: ventas.canal,
        cantidad: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(${ventas.total}), 0)::numeric`,
      })
      .from(ventas)
      .where(
        and(
          byTenant(tenantId, ventas),
          sql`${ventas.fecha}::date = ${hoy}`,
          sql`${ventas.estado} != 'anulada'`,
        )
      )
      .groupBy(ventas.canal),

    // Clientes con saldo en cuenta corriente
    db
      .select({
        cantidad: sql<number>`count(*)::int`,
        totalDeuda: sql<number>`coalesce(sum(${clientes.saldoActual}), 0)::numeric`,
      })
      .from(clientes)
      .where(
        and(
          byTenant(tenantId, clientes),
          eq(clientes.habilitaCuentaCorriente, true),
          gt(clientes.saldoActual, '0'),
        )
      ),

    // Productos con stock bajo (stockActual <= stockMinimo)
    db
      .select({ cantidad: sql<number>`count(*)::int` })
      .from(productos)
      .where(
        and(
          byTenant(tenantId, productos),
          eq(productos.activo, true),
          isNotNull(productos.stockMinimo),
          sql`${productos.stockActual} <= ${productos.stockMinimo}`,
        )
      ),

    // Últimas 8 ventas
    db
      .select({
        id: ventas.id,
        numero: ventas.numero,
        canal: ventas.canal,
        fecha: ventas.fecha,
        total: ventas.total,
        estado: ventas.estado,
        clienteNombre: clientes.razonSocial,
      })
      .from(ventas)
      .leftJoin(clientes, eq(ventas.clienteId, clientes.id))
      .where(and(byTenant(tenantId, ventas), sql`${ventas.estado} != 'anulada'`))
      .orderBy(sql`${ventas.fecha} desc`)
      .limit(8),
  ]);

  const minorista = ventasHoy.find((v) => v.canal === 'minorista');
  const mayorista = ventasHoy.find((v) => v.canal === 'mayorista');

  return {
    ventasHoy: {
      minorista: { cantidad: minorista?.cantidad ?? 0, total: Number(minorista?.total ?? 0) },
      mayorista: { cantidad: mayorista?.cantidad ?? 0, total: Number(mayorista?.total ?? 0) },
    },
    pendienteCC: {
      cantidad: pendienteCC[0]?.cantidad ?? 0,
      total: Number(pendienteCC[0]?.totalDeuda ?? 0),
    },
    stockBajo: stockBajo[0]?.cantidad ?? 0,
    ultimasVentas,
  };
}
