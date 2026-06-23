'use server';

import { and, sql, desc, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import {
  gastos,
  ventas,
  presupuestos,
  pagosPrestamo,
  pedidosAtmosfericos,
} from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requireAdmin } from '@/server/auth/session';
import { gastoInputSchema, formatZodError } from '@/server/schemas';
import { planTiene, type PlanId } from '@/lib/planes';
import { construirBalance, rangoMes, type BalanceMensual } from '@/lib/balance';
import { generarAnalisisMensual } from '@/lib/ia/analisis-mensual';

const TZ = 'America/Argentina/Buenos_Aires';

type Result = { ok: boolean; error?: string };

/** Mes 'YYYY-MM' del calendario de Buenos Aires para hoy. */
function mesActualAr(): string {
  const ar = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  return `${ar.getFullYear()}-${String(ar.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Ingresos del plan dentro del rango [inicio, fin) (fechas YYYY-MM-DD, ART).
 * La fuente depende del plan (igual criterio que los reportes):
 *  - POS → ventas no anuladas · servicios → presupuestos cobrados
 *  - prestamista → cobranzas (pagos de préstamo) · atmosféricos → monto cobrado
 */
async function ingresosDelRango(
  tenantId: string,
  plan: PlanId,
  inicio: string,
  fin: string,
): Promise<number> {
  const num = (r?: { s: string }) => Number(r?.s ?? 0);

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
}

/** Suma de gastos (no anulados) en el rango [inicio, fin). */
async function gastosFilasDelRango(tenantId: string, inicio: string, fin: string) {
  return db
    .select({ categoria: gastos.categoria, monto: gastos.monto })
    .from(gastos)
    .where(and(
      byTenant(tenantId, gastos),
      isNull(gastos.deletedAt),
      sql`(${gastos.fecha} AT TIME ZONE ${TZ})::date >= ${inicio}::date`,
      sql`(${gastos.fecha} AT TIME ZONE ${TZ})::date < ${fin}::date`,
    ));
}

// ── Registrar / listar / anular gastos ───────────────────────────────────────

export async function crearGasto(input: unknown): Promise<Result> {
  try {
    const session = await requireAdmin();
    const parsed = gastoInputSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };
    const d = parsed.data;

    await db.insert(gastos).values({
      tenantId: session.tenantId,
      // Mediodía UTC → mismo día calendario en ART; evita corrimientos de fecha.
      fecha: new Date(d.fecha + 'T12:00:00Z'),
      categoria: d.categoria.trim(),
      monto: Number(d.monto).toFixed(2),
      descripcion: d.descripcion?.trim() || null,
      metodoPago: d.metodoPago ?? null,
      creadoPor: session.email,
    });

    revalidatePath('/dashboard/gastos');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo registrar el gasto' };
  }
}

export async function listarGastos(mes: string) {
  const session = await requireAdmin();
  const { inicio, fin } = rangoMes(mes);
  return db
    .select({
      id: gastos.id,
      fecha: gastos.fecha,
      categoria: gastos.categoria,
      monto: gastos.monto,
      descripcion: gastos.descripcion,
      metodoPago: gastos.metodoPago,
    })
    .from(gastos)
    .where(and(
      byTenant(session.tenantId, gastos),
      isNull(gastos.deletedAt),
      sql`(${gastos.fecha} AT TIME ZONE ${TZ})::date >= ${inicio}::date`,
      sql`(${gastos.fecha} AT TIME ZONE ${TZ})::date < ${fin}::date`,
    ))
    .orderBy(desc(gastos.fecha));
}

export async function anularGasto(id: string): Promise<Result> {
  try {
    const session = await requireAdmin();
    await db
      .update(gastos)
      .set({ deletedAt: new Date() })
      .where(and(byTenant(session.tenantId, gastos), eq(gastos.id, id)));
    revalidatePath('/dashboard/gastos');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo borrar el gasto' };
  }
}

// ── Balance mensual ──────────────────────────────────────────────────────────

/** Balance del mes 'YYYY-MM' (default: mes actual ART). */
export async function obtenerBalanceMensual(mes?: string): Promise<BalanceMensual> {
  const session = await requireAdmin();
  const m = mes ?? mesActualAr();
  const { inicio, fin, mesPrev } = rangoMes(m);
  const prev = rangoMes(mesPrev);

  const [ingresos, ingresosPrev, gastosFilasRaw, gastosFilasPrevRaw] = await Promise.all([
    ingresosDelRango(session.tenantId, session.plan, inicio, fin),
    ingresosDelRango(session.tenantId, session.plan, prev.inicio, prev.fin),
    gastosFilasDelRango(session.tenantId, inicio, fin),
    gastosFilasDelRango(session.tenantId, prev.inicio, prev.fin),
  ]);

  const gastosFilas = gastosFilasRaw.map((g) => ({ categoria: g.categoria, monto: Number(g.monto) }));
  const gastosPrev = gastosFilasPrevRaw.reduce((a, g) => a + Number(g.monto), 0);

  return construirBalance({ mes: m, ingresos, gastosFilas, ingresosPrev, gastosPrev });
}

// ── Análisis con IA ──────────────────────────────────────────────────────────

export type AnalisisResult =
  | { ok: true; analisis: string; generadoPorIA: boolean }
  | { ok: false; error: string };

/** Genera el análisis del mes (narrativa). Cae a un resumen sin IA si no hay API key. */
export async function analizarMes(mes?: string): Promise<AnalisisResult> {
  try {
    const session = await requireAdmin();
    const balance = await obtenerBalanceMensual(mes);
    const { texto, generadoPorIA } = await generarAnalisisMensual({
      balance,
      plan: session.plan,
      negocio: session.tenantNombre,
    });
    return { ok: true, analisis: texto, generadoPorIA };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo generar el análisis' };
  }
}
