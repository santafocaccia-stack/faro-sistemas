/**
 * Servicio de balance mensual — lógica reutilizable SIN sesión.
 *
 * Lo usan tanto los server actions (con sesión, para la pantalla de Gastos)
 * como el cron de generación automática (sin sesión, iterando tenants). Por eso
 * vive fuera de `gastos.ts` (que es 'use server' y solo expone acciones async).
 */
import { and, eq, sql, desc, isNull, inArray } from 'drizzle-orm';
import { withTenant, dbAdmin } from '@/server/db';
import {
  gastos,
  ventas,
  presupuestos,
  pagosPrestamo,
  pedidosAtmosfericos,
  balancesMensuales,
  tenants,
} from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { planTiene, type PlanId } from '@/lib/planes';
import { construirBalance, rangoMes, type BalanceMensual } from '@/lib/balance';
import { generarAnalisisMensual } from '@/lib/ia/analisis-mensual';
import { diaGeneracion, mesObjetivoAuto } from '@/lib/balance-auto';

const TZ = 'America/Argentina/Buenos_Aires';

/**
 * Ingresos del plan dentro del rango [inicio, fin) (fechas YYYY-MM-DD, ART).
 * Misma fuente que los reportes: POS → ventas no anuladas · servicios →
 * presupuestos cobrados · prestamista → cobranzas · atmosféricos → cobrado.
 */
async function ingresosDelRango(
  tenantId: string,
  plan: PlanId,
  inicio: string,
  fin: string,
): Promise<number> {
  const num = (r?: { s: string }) => Number(r?.s ?? 0);

  return withTenant(tenantId, async (db) => {
  if (planTiene(plan, 'pos')) {
    const [r] = await db
      .select({ s: sql<string>`coalesce(sum(${ventas.total}), 0)::text` })
      .from(ventas)
      .where(and(
        byTenant(tenantId, ventas),
        sql`${ventas.estado} != 'anulada'`,
        sql`(${ventas.fecha} AT TIME ZONE ${TZ})::date >= ${inicio}::date`,
        sql`(${ventas.fecha} AT TIME ZONE ${TZ})::date < ${fin}::date`,
      ));
    return num(r);
  }
  if (planTiene(plan, 'presupuestos')) {
    const [r] = await db
      .select({ s: sql<string>`coalesce(sum(${presupuestos.total}), 0)::text` })
      .from(presupuestos)
      .where(and(
        byTenant(tenantId, presupuestos),
        eq(presupuestos.estado, 'cobrado'),
        sql`${presupuestos.cobradoAt} is not null`,
        sql`(${presupuestos.cobradoAt} AT TIME ZONE ${TZ})::date >= ${inicio}::date`,
        sql`(${presupuestos.cobradoAt} AT TIME ZONE ${TZ})::date < ${fin}::date`,
      ));
    return num(r);
  }
  if (planTiene(plan, 'prestamos')) {
    const [r] = await db
      .select({ s: sql<string>`coalesce(sum(${pagosPrestamo.montoTotal}), 0)::text` })
      .from(pagosPrestamo)
      .where(and(
        byTenant(tenantId, pagosPrestamo),
        sql`${pagosPrestamo.anuladoAt} is null`,
        sql`(${pagosPrestamo.fecha} AT TIME ZONE ${TZ})::date >= ${inicio}::date`,
        sql`(${pagosPrestamo.fecha} AT TIME ZONE ${TZ})::date < ${fin}::date`,
      ));
    return num(r);
  }
  if (planTiene(plan, 'atmosfericos')) {
    const [r] = await db
      .select({ s: sql<string>`coalesce(sum(${pedidosAtmosfericos.montoCobrado}), 0)::text` })
      .from(pedidosAtmosfericos)
      .where(and(
        byTenant(tenantId, pedidosAtmosfericos),
        sql`${pedidosAtmosfericos.montoCobrado} is not null`,
        sql`${pedidosAtmosfericos.fechaProgramada} >= ${inicio}::date`,
        sql`${pedidosAtmosfericos.fechaProgramada} < ${fin}::date`,
      ));
    return num(r);
  }
  return 0;
  });
}

/** Filas de gastos (no anulados) en el rango [inicio, fin). */
async function gastosFilasDelRango(tenantId: string, inicio: string, fin: string) {
  return withTenant(tenantId, (db) =>
    db
      .select({ categoria: gastos.categoria, monto: gastos.monto })
      .from(gastos)
      .where(and(
        byTenant(tenantId, gastos),
        isNull(gastos.deletedAt),
        sql`(${gastos.fecha} AT TIME ZONE ${TZ})::date >= ${inicio}::date`,
        sql`(${gastos.fecha} AT TIME ZONE ${TZ})::date < ${fin}::date`,
      )),
  );
}

/** Balance del mes 'YYYY-MM' para un tenant/plan (sin sesión). */
export async function computarBalanceMensual(
  tenantId: string,
  plan: PlanId,
  mes: string,
): Promise<BalanceMensual> {
  const { inicio, fin, mesPrev } = rangoMes(mes);
  const prev = rangoMes(mesPrev);

  const [ingresos, ingresosPrev, gastosFilasRaw, gastosFilasPrevRaw] = await Promise.all([
    ingresosDelRango(tenantId, plan, inicio, fin),
    ingresosDelRango(tenantId, plan, prev.inicio, prev.fin),
    gastosFilasDelRango(tenantId, inicio, fin),
    gastosFilasDelRango(tenantId, prev.inicio, prev.fin),
  ]);

  const gastosFilas = gastosFilasRaw.map((g) => ({ categoria: g.categoria, monto: Number(g.monto) }));
  const gastosPrev = gastosFilasPrevRaw.reduce((a, g) => a + Number(g.monto), 0);

  return construirBalance({ mes, ingresos, gastosFilas, ingresosPrev, gastosPrev });
}

export type BalanceGuardado = {
  analisis: string;
  generadoPorIa: boolean;
  origen: string;
  datos: BalanceMensual | null;
  fecha: string; // ISO del updatedAt
};

/** Balance ya guardado para (tenant, mes), o null si no existe. */
export async function obtenerBalanceGuardado(
  tenantId: string,
  mes: string,
): Promise<BalanceGuardado | null> {
  const [row] = await withTenant(tenantId, (db) =>
    db
      .select()
      .from(balancesMensuales)
      .where(and(byTenant(tenantId, balancesMensuales), eq(balancesMensuales.mes, mes)))
      .limit(1),
  );
  if (!row) return null;
  return {
    analisis: row.analisis,
    generadoPorIa: row.generadoPorIa,
    origen: row.origen,
    datos: row.datos ?? null,
    fecha: row.updatedAt.toISOString(),
  };
}

/**
 * Computa el balance del mes, genera el análisis (IA o fallback) y lo persiste
 * (upsert por tenant+mes). Devuelve el análisis para mostrarlo al toque.
 */
export async function generarYGuardarBalance(
  tenant: { id: string; plan: PlanId; nombre: string },
  mes: string,
  origen: 'automatico' | 'manual',
): Promise<{ analisis: string; generadoPorIa: boolean; datos: BalanceMensual }> {
  const datos = await computarBalanceMensual(tenant.id, tenant.plan, mes);
  const { texto, generadoPorIA } = await generarAnalisisMensual({
    balance: datos,
    plan: tenant.plan,
    negocio: tenant.nombre,
  });

  await withTenant(tenant.id, (db) =>
    db
    .insert(balancesMensuales)
    .values({
      tenantId: tenant.id,
      mes,
      analisis: texto,
      generadoPorIa: generadoPorIA,
      datos,
      origen,
    })
    .onConflictDoUpdate({
      target: [balancesMensuales.tenantId, balancesMensuales.mes],
      set: {
        analisis: texto,
        generadoPorIa: generadoPorIA,
        datos,
        origen,
        updatedAt: new Date(),
      },
    }),
  );

  return { analisis: texto, generadoPorIa: generadoPorIA, datos };
}

/** Meses con balance guardado para un tenant (más recientes primero). */
export async function listarMesesConBalance(tenantId: string): Promise<string[]> {
  const rows = await withTenant(tenantId, (db) =>
    db
      .select({ mes: balancesMensuales.mes })
      .from(balancesMensuales)
      .where(byTenant(tenantId, balancesMensuales))
      .orderBy(desc(balancesMensuales.mes)),
  );
  return rows.map((r) => r.mes);
}

/**
 * Generación automática: recorre los tenants activos con el balance automático
 * encendido y, si HOY (ART) es su día de generación, cierra el mes que
 * corresponde (si no estaba ya guardado). Idempotente: correrlo dos veces el
 * mismo día no duplica ni regenera. Lo invoca el cron diario.
 *
 * @param ahoraArt fecha "hoy" ya convertida a hora de Buenos Aires.
 */
export async function procesarBalancesMensuales(
  ahoraArt: Date,
): Promise<{ generados: number; candidatos: number }> {
  const year = ahoraArt.getFullYear();
  const month0 = ahoraArt.getMonth();
  const hoy = ahoraArt.getDate();

  // dbAdmin: el cron recorre todos los tenants a propósito (sin sesión).
  const filas = await dbAdmin
    .select({
      id: tenants.id,
      nombre: tenants.nombre,
      plan: tenants.plan,
      dia: tenants.balanceAutoDia,
    })
    .from(tenants)
    .where(and(
      inArray(tenants.status, ['activo', 'trial']),
      isNull(tenants.deletedAt),
      eq(tenants.balanceAutoActivo, true),
    ));

  let generados = 0;
  let candidatos = 0;

  for (const t of filas) {
    if (hoy !== diaGeneracion(year, month0, t.dia)) continue;
    candidatos++;
    const mes = mesObjetivoAuto(year, month0, t.dia);
    if (await obtenerBalanceGuardado(t.id, mes)) continue; // ya cerrado
    try {
      await generarYGuardarBalance({ id: t.id, plan: t.plan, nombre: t.nombre }, mes, 'automatico');
      generados++;
    } catch (e) {
      console.error(`[balance-auto] tenant ${t.id} mes ${mes}:`, e);
    }
  }

  return { generados, candidatos };
}
