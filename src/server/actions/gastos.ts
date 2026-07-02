'use server';

import { and, sql, desc, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { withTenant } from '@/server/db';
import { gastos, tenants } from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requirePermiso } from '@/server/auth/session';
import { gastoInputSchema, formatZodError } from '@/server/schemas';
import { rangoMes, type BalanceMensual } from '@/lib/balance';
import {
  computarBalanceMensual,
  generarYGuardarBalance,
  obtenerBalanceGuardado,
  type BalanceGuardado,
} from '@/server/balance/balance-service';

const TZ = 'America/Argentina/Buenos_Aires';

type Result = { ok: boolean; error?: string };

/** Mes 'YYYY-MM' del calendario de Buenos Aires para hoy. */
function mesActualAr(): string {
  const ar = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  return `${ar.getFullYear()}-${String(ar.getMonth() + 1).padStart(2, '0')}`;
}

// ── Registrar / listar / anular gastos ───────────────────────────────────────

export async function crearGasto(input: unknown): Promise<Result> {
  try {
    const session = await requirePermiso('ver_reportes');
    const parsed = gastoInputSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };
    const d = parsed.data;

    await withTenant(session.tenantId, (db) =>
      db.insert(gastos).values({
        tenantId: session.tenantId,
        // Mediodía UTC → mismo día calendario en ART; evita corrimientos de fecha.
        fecha: new Date(d.fecha + 'T12:00:00Z'),
        categoria: d.categoria.trim(),
        monto: Number(d.monto).toFixed(2),
        descripcion: d.descripcion?.trim() || null,
        metodoPago: d.metodoPago ?? null,
        creadoPor: session.email,
      }),
    );

    revalidatePath('/dashboard/gastos');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo registrar el gasto' };
  }
}

export async function listarGastos(mes: string) {
  const session = await requirePermiso('ver_reportes');
  const { inicio, fin } = rangoMes(mes);
  return withTenant(session.tenantId, (db) =>
    db
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
    .orderBy(desc(gastos.fecha)),
  );
}

/** Gastos de un día puntual (YYYY-MM-DD, ART). Para la vista diaria. */
export async function listarGastosDelDia(fecha: string) {
  const session = await requirePermiso('ver_reportes');
  return withTenant(session.tenantId, (db) =>
    db
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
        sql`(${gastos.fecha} AT TIME ZONE ${TZ})::date = ${fecha}::date`,
      ))
      .orderBy(desc(gastos.fecha)),
  );
}

export async function anularGasto(id: string): Promise<Result> {
  try {
    const session = await requirePermiso('ver_reportes');
    await withTenant(session.tenantId, (db) =>
      db
        .update(gastos)
        .set({ deletedAt: new Date() })
        .where(and(byTenant(session.tenantId, gastos), eq(gastos.id, id))),
    );
    revalidatePath('/dashboard/gastos');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo borrar el gasto' };
  }
}

// ── Balance mensual ──────────────────────────────────────────────────────────

/** Balance del mes 'YYYY-MM' (default: mes actual ART). */
export async function obtenerBalanceMensual(mes?: string): Promise<BalanceMensual> {
  const session = await requirePermiso('ver_reportes');
  return computarBalanceMensual(session.tenantId, session.plan, mes ?? mesActualAr());
}

// ── Análisis con IA ──────────────────────────────────────────────────────────

export type AnalisisResult =
  | { ok: true; analisis: string; generadoPorIA: boolean }
  | { ok: false; error: string };

/**
 * Genera el análisis del mes (narrativa) y lo guarda (upsert). Cae a un resumen
 * sin IA si no hay API key. Origen 'manual' (lo pidió el usuario a mano).
 */
export async function analizarMes(mes?: string): Promise<AnalisisResult> {
  try {
    const session = await requirePermiso('ver_reportes');
    const m = mes ?? mesActualAr();
    const { analisis, generadoPorIa } = await generarYGuardarBalance(
      { id: session.tenantId, plan: session.plan, nombre: session.tenantNombre },
      m,
      'manual',
    );
    return { ok: true, analisis, generadoPorIA: generadoPorIa };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo generar el análisis' };
  }
}

/** Análisis ya guardado para el mes (si existe). Lo usa la página para precargarlo. */
export async function obtenerAnalisisMes(mes?: string): Promise<BalanceGuardado | null> {
  const session = await requirePermiso('ver_reportes');
  return obtenerBalanceGuardado(session.tenantId, mes ?? mesActualAr());
}

// ── Configuración del balance automático ─────────────────────────────────────

export type ConfigBalanceAuto = { activo: boolean; dia: number | null };

export async function obtenerConfigBalanceAuto(): Promise<ConfigBalanceAuto> {
  const session = await requirePermiso('ver_reportes');
  const [t] = await withTenant(session.tenantId, (db) =>
    db
      .select({ activo: tenants.balanceAutoActivo, dia: tenants.balanceAutoDia })
      .from(tenants)
      .where(eq(tenants.id, session.tenantId))
      .limit(1),
  );
  return { activo: t?.activo ?? true, dia: t?.dia ?? null };
}

export async function guardarConfigBalanceAuto(cfg: ConfigBalanceAuto): Promise<Result> {
  try {
    const session = await requirePermiso('ver_reportes');
    // dia: null = último día hábil; si viene número se acota a 1-28 (días que
    // existen en todos los meses, para que la programación sea estable).
    const dia =
      cfg.dia == null ? null : Math.min(Math.max(Math.trunc(cfg.dia), 1), 28);
    await withTenant(session.tenantId, (db) =>
      db
        .update(tenants)
        .set({ balanceAutoActivo: cfg.activo, balanceAutoDia: dia })
        .where(eq(tenants.id, session.tenantId)),
    );
    revalidatePath('/dashboard/gastos');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo guardar la configuración' };
  }
}
