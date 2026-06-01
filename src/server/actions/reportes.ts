'use server';

import { unstable_cache } from 'next/cache';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { ventas, ventasLineas, pagos, productos, presupuestos, pagosPrestamo } from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requireAdmin } from '@/server/auth/session';
import { planTiene, type PlanId } from '@/lib/planes';

export type Periodo = 'hoy' | 'semana' | 'mes' | 'tres_meses';

// ── Serie temporal por plan (gráfico de líneas + comparativa) ──────────────────

export type Granularidad = 'dia' | 'semana' | 'mes' | 'trimestre' | 'anio';

const BUCKETS: Record<Granularidad, number> = { dia: 14, semana: 8, mes: 12, trimestre: 8, anio: 5 };

function arHoy(): Date {
  const ar = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  return new Date(ar.getFullYear(), ar.getMonth(), ar.getDate());
}
function inicioBucket(d: Date, g: Granularidad): Date {
  const y = d.getFullYear(), m = d.getMonth();
  switch (g) {
    case 'dia': return new Date(y, m, d.getDate());
    case 'semana': { const off = (d.getDay() + 6) % 7; return new Date(y, m, d.getDate() - off); }
    case 'mes': return new Date(y, m, 1);
    case 'trimestre': return new Date(y, Math.floor(m / 3) * 3, 1);
    case 'anio': return new Date(y, 0, 1);
  }
}
function correrBucket(d: Date, g: Granularidad, k: number): Date {
  const r = new Date(d);
  switch (g) {
    case 'dia': r.setDate(r.getDate() + k); break;
    case 'semana': r.setDate(r.getDate() + k * 7); break;
    case 'mes': r.setMonth(r.getMonth() + k); break;
    case 'trimestre': r.setMonth(r.getMonth() + k * 3); break;
    case 'anio': r.setFullYear(r.getFullYear() + k); break;
  }
  return r;
}
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function etiquetaBucket(d: Date, g: Granularidad): string {
  const dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0');
  switch (g) {
    case 'dia':
    case 'semana': return `${dd}/${mm}`;
    case 'mes': return `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    case 'trimestre': return `T${Math.floor(d.getMonth() / 3) + 1} '${String(d.getFullYear()).slice(2)}`;
    case 'anio': return String(d.getFullYear());
  }
}

/** Devuelve serie del período actual + período anterior (misma cantidad de buckets). */
export async function obtenerSerieReporte(granularidad: Granularidad = 'dia') {
  const session = await requireAdmin();
  const { tenantId, plan } = session;
  const g = granularidad;
  const N = BUCKETS[g];

  // 2N buckets, del más viejo al más nuevo
  const inicios: Date[] = [];
  let cur = inicioBucket(arHoy(), g);
  for (let i = 0; i < 2 * N; i++) { inicios.push(cur); cur = correrBucket(cur, g, -1); }
  inicios.reverse();
  const spanStart = inicios[0]!;
  const spanStartIso = `${spanStart.getFullYear()}-${String(spanStart.getMonth() + 1).padStart(2, '0')}-${String(spanStart.getDate()).padStart(2, '0')}`;
  const tz = 'America/Argentina/Buenos_Aires';

  // Filas { d: 'YYYY-MM-DD', monto } según el plan
  let filas: { d: string; monto: number }[] = [];
  if (planTiene(plan as PlanId, 'pos')) {
    filas = (await db.select({
      d: sql<string>`(${ventas.fecha} AT TIME ZONE ${tz})::date::text`,
      monto: sql<number>`${ventas.total}::numeric`,
    }).from(ventas).where(and(
      byTenant(tenantId, ventas),
      sql`${ventas.estado} != 'anulada'`,
      sql`(${ventas.fecha} AT TIME ZONE ${tz})::date >= ${spanStartIso}::date`,
    ))).map((r) => ({ d: r.d, monto: Number(r.monto) }));
  } else if (planTiene(plan as PlanId, 'presupuestos')) {
    filas = (await db.select({
      d: sql<string>`(${presupuestos.cobradoAt} AT TIME ZONE ${tz})::date::text`,
      monto: sql<number>`${presupuestos.total}::numeric`,
    }).from(presupuestos).where(and(
      byTenant(tenantId, presupuestos),
      eq(presupuestos.estado, 'cobrado'),
      sql`${presupuestos.cobradoAt} is not null`,
      sql`(${presupuestos.cobradoAt} AT TIME ZONE ${tz})::date >= ${spanStartIso}::date`,
    ))).map((r) => ({ d: r.d, monto: Number(r.monto) }));
  } else if (planTiene(plan as PlanId, 'prestamos')) {
    filas = (await db.select({
      d: sql<string>`(${pagosPrestamo.fecha} AT TIME ZONE ${tz})::date::text`,
      monto: sql<number>`${pagosPrestamo.montoTotal}::numeric`,
    }).from(pagosPrestamo).where(and(
      byTenant(tenantId, pagosPrestamo),
      sql`${pagosPrestamo.anuladoAt} is null`,
      sql`(${pagosPrestamo.fecha} AT TIME ZONE ${tz})::date >= ${spanStartIso}::date`,
    ))).map((r) => ({ d: r.d, monto: Number(r.monto) }));
  }

  // Acumular por bucket
  const sumas = new Map<number, number>();
  for (const f of filas) {
    const [y, m, d] = f.d.split('-').map(Number);
    const k = inicioBucket(new Date(y!, m! - 1, d!), g).getTime();
    sumas.set(k, (sumas.get(k) ?? 0) + f.monto);
  }
  const valores = inicios.map((s) => sumas.get(s.getTime()) ?? 0);
  const actualStarts = inicios.slice(N);
  const serie = actualStarts.map((s, i) => ({ label: etiquetaBucket(s, g), valor: valores[N + i]! }));
  const comparacion = actualStarts.map((s, i) => ({ label: etiquetaBucket(s, g), valor: valores[i]! }));

  const totalActual = serie.reduce((a, s) => a + s.valor, 0);
  const totalPrevio = comparacion.reduce((a, s) => a + s.valor, 0);
  const metricaLabel = planTiene(plan as PlanId, 'prestamos') ? 'Cobranzas'
    : planTiene(plan as PlanId, 'pos') ? 'Ventas' : 'Cobrado';

  return { serie, comparacion, totalActual, totalPrevio, metricaLabel };
}

function inicioDesde(periodo: Periodo) {
  const tz = `'America/Argentina/Buenos_Aires'`;
  switch (periodo) {
    case 'hoy':        return sql`(NOW() AT TIME ZONE ${sql.raw(tz)})::date`;
    case 'semana':     return sql`(NOW() AT TIME ZONE ${sql.raw(tz)})::date - INTERVAL '6 days'`;
    case 'mes':        return sql`(NOW() AT TIME ZONE ${sql.raw(tz)})::date - INTERVAL '29 days'`;
    case 'tres_meses': return sql`(NOW() AT TIME ZONE ${sql.raw(tz)})::date - INTERVAL '89 days'`;
  }
}

/**
 * Consultas DB cacheadas por (tenantId, periodo).
 * TTL conservador: 5 min para "hoy", 30 min para períodos históricos.
 * Se invalida con revalidateTag(`reporte-${tenantId}`) al crear una venta.
 */
const fetchReporteData = unstable_cache(
  async (tenantId: string, periodo: Periodo) => {
    const desde = inicioDesde(periodo);
    const filtroBase = and(
      byTenant(tenantId, ventas),
      sql`${ventas.fecha} >= ${desde}`,
      sql`${ventas.estado} != 'anulada'`,
    );

    const [resumen, porCanal, porMetodo, porDia, topProductos] = await Promise.all([
      db.select({
        cantidad:      sql<number>`count(*)::int`,
        total:         sql<number>`coalesce(sum(${ventas.total}), 0)::numeric`,
        ticketPromedio:sql<number>`coalesce(avg(${ventas.total}), 0)::numeric`,
      }).from(ventas).where(filtroBase),

      db.select({
        canal:    ventas.canal,
        cantidad: sql<number>`count(*)::int`,
        total:    sql<number>`coalesce(sum(${ventas.total}), 0)::numeric`,
      }).from(ventas).where(filtroBase).groupBy(ventas.canal),

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

    return { resumen, porCanal, porMetodo, porDia, topProductos };
  },
  // Clave de cache: incluye tenantId y periodo en el keyParts para evitar colisiones
  ['reporte'],
  {
    revalidate: 5 * 60, // 5 minutos TTL — datos frescos en cada visita sin hammear la DB
  },
);

export async function obtenerReporte(periodo: Periodo = 'mes') {
  const session = await requireAdmin();
  const { tenantId } = session;

  // fetchReporteData está cacheada por (tenantId, periodo) — 5 min TTL
  const { resumen, porCanal, porMetodo, porDia, topProductos } =
    await fetchReporteData(tenantId, periodo);

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
