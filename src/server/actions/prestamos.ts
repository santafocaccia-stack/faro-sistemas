'use server';

import { eq, and, isNull, asc, sql, gte } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  prestamos,
  cuotas,
  pagosPrestamo,
  clientes,
  type EstadoCuota,
  type FrecuenciaPago,
  type SistemaAmortizacion,
  type MetodoPago,
} from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requireSession } from '@/server/auth/session';
import { generarCronograma, calcularMora, imputarPago } from '@/lib/prestamos';
import { revalidatePath } from 'next/cache';

const n = (s: string | null | undefined) => Number(s ?? 0);
const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

// ─── Crear préstamo (genera cronograma) ──────────────────────────────────────
type PrestamoInput = {
  clienteId: string;
  capital: string;
  tasaNominalAnual: string;
  frecuencia: FrecuenciaPago;
  cantidadCuotas: string | number;
  fechaOtorgamiento: string; // yyyy-mm-dd
  fechaPrimerVencimiento: string;
  sistema?: SistemaAmortizacion;
  tasaPunitoriaAnual?: string | null;
  diasGracia?: string | number;
  notas?: string | null;
};

export async function crearPrestamo(input: PrestamoInput) {
  const session = await requireSession();

  const capital = Number(input.capital);
  const tasa = Number(input.tasaNominalAnual);
  const cant = Number(input.cantidadCuotas);
  if (!capital || capital <= 0) return { ok: false as const, error: 'Capital inválido' };
  if (isNaN(tasa) || tasa < 0) return { ok: false as const, error: 'Tasa inválida' };
  if (!cant || cant < 1) return { ok: false as const, error: 'Cantidad de cuotas inválida' };

  // Verificar que el deudor pertenece al tenant
  const [cli] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(and(byTenant(session.tenantId, clientes), eq(clientes.id, input.clienteId)))
    .limit(1);
  if (!cli) return { ok: false as const, error: 'Deudor no encontrado' };

  const sistema = input.sistema ?? 'frances';
  const cronograma = generarCronograma({
    capital,
    tasaNominalAnualPct: tasa,
    cantidadCuotas: cant,
    frecuencia: input.frecuencia,
    sistema,
    fechaPrimerVencimiento: new Date(input.fechaPrimerVencimiento + 'T00:00:00'),
  });

  const id = await db.transaction(async (tx) => {
    const [p] = await tx
      .insert(prestamos)
      .values({
        tenantId: session.tenantId,
        clienteId: input.clienteId,
        capital: capital.toFixed(2),
        tasaNominalAnual: tasa.toFixed(4),
        frecuencia: input.frecuencia,
        cantidadCuotas: cant,
        sistema,
        fechaOtorgamiento: input.fechaOtorgamiento,
        fechaPrimerVencimiento: input.fechaPrimerVencimiento,
        tasaPunitoriaAnual: input.tasaPunitoriaAnual ? Number(input.tasaPunitoriaAnual).toFixed(4) : null,
        diasGracia: input.diasGracia ? Number(input.diasGracia) : 0,
        notas: input.notas || null,
      })
      .returning({ id: prestamos.id });

    await tx.insert(cuotas).values(
      cronograma.map((c) => ({
        tenantId: session.tenantId,
        prestamoId: p!.id,
        numero: c.numero,
        vencimiento: c.vencimiento.toISOString().slice(0, 10),
        montoCuota: c.montoCuota.toFixed(2),
        capital: c.capital.toFixed(2),
        interes: c.interes.toFixed(2),
        saldoPosterior: c.saldoPosterior.toFixed(2),
      })),
    );
    return p!.id;
  });

  revalidatePath('/dashboard/prestamos');
  return { ok: true as const, id };
}

// ─── Listado ─────────────────────────────────────────────────────────────────
export async function listarPrestamos() {
  const session = await requireSession();
  return db
    .select({
      id: prestamos.id,
      estado: prestamos.estado,
      capital: prestamos.capital,
      cantidadCuotas: prestamos.cantidadCuotas,
      fechaOtorgamiento: prestamos.fechaOtorgamiento,
      clienteNombre: clientes.razonSocial,
      saldoPendiente: sql<string>`coalesce((
        select sum(${cuotas.montoCuota} - ${cuotas.montoPagado})
        from ${cuotas}
        where ${cuotas.prestamoId} = ${prestamos.id} and ${cuotas.estado} <> 'pagada'
      ), 0)`,
    })
    .from(prestamos)
    .innerJoin(clientes, eq(prestamos.clienteId, clientes.id))
    .where(and(byTenant(session.tenantId, prestamos), isNull(prestamos.deletedAt)))
    .orderBy(asc(prestamos.estado));
}

// ─── Detalle (con mora on-read) ──────────────────────────────────────────────
export async function obtenerPrestamo(id: string) {
  const session = await requireSession();
  const [p] = await db
    .select()
    .from(prestamos)
    .where(and(byTenant(session.tenantId, prestamos), eq(prestamos.id, id), isNull(prestamos.deletedAt)))
    .limit(1);
  if (!p) return null;

  const [cli] = await db
    .select({ razonSocial: clientes.razonSocial, telefono: clientes.telefono })
    .from(clientes)
    .where(and(byTenant(session.tenantId, clientes), eq(clientes.id, p.clienteId)))
    .limit(1);

  const filas = await db
    .select()
    .from(cuotas)
    .where(and(byTenant(session.tenantId, cuotas), eq(cuotas.prestamoId, id)))
    .orderBy(asc(cuotas.numero));

  const hoy = new Date();
  const tasaPunit = n(p.tasaPunitoriaAnual);
  const lineas = filas.map((c) => {
    const venc = new Date(c.vencimiento + 'T00:00:00');
    const impago = r2(n(c.montoCuota) - n(c.montoPagado));
    const moraViva =
      c.estado !== 'pagada' && impago > 0
        ? calcularMora(impago, venc, hoy, tasaPunit, p.diasGracia)
        : 0;
    const vencida = c.estado !== 'pagada' && venc < hoy;
    return { ...c, impago, moraViva: r2(moraViva + n(c.moraAcumulada)), vencida };
  });

  const pagos = await db
    .select()
    .from(pagosPrestamo)
    .where(and(byTenant(session.tenantId, pagosPrestamo), eq(pagosPrestamo.prestamoId, id), isNull(pagosPrestamo.anuladoAt)))
    .orderBy(asc(pagosPrestamo.fecha));

  return { prestamo: p, cliente: cli, cuotas: lineas, pagos };
}

// ─── Registrar pago (imputación mora → interés → capital) ────────────────────
export async function registrarPagoPrestamo(input: {
  prestamoId: string;
  monto: string;
  metodo: MetodoPago;
  referencia?: string;
}) {
  const session = await requireSession();
  const monto = Number(input.monto);
  if (!monto || monto <= 0) return { ok: false as const, error: 'Monto inválido' };

  await db.transaction(async (tx) => {
    const [p] = await tx
      .select()
      .from(prestamos)
      .where(and(byTenant(session.tenantId, prestamos), eq(prestamos.id, input.prestamoId)))
      .limit(1)
      .for('update');
    if (!p) throw new Error('Préstamo no encontrado');

    const pendientes = await tx
      .select()
      .from(cuotas)
      .where(and(byTenant(session.tenantId, cuotas), eq(cuotas.prestamoId, p.id), sql`${cuotas.estado} <> 'pagada'`))
      .orderBy(asc(cuotas.numero));

    const hoy = new Date();
    const tasaPunit = n(p.tasaPunitoriaAnual);
    let restante = monto;
    let totMora = 0, totInteres = 0, totCapital = 0;

    for (const c of pendientes) {
      if (restante <= 0) break;
      const venc = new Date(c.vencimiento + 'T00:00:00');
      const interesPagado = Math.min(n(c.montoPagado), n(c.interes));
      const capitalPagado = Math.max(0, n(c.montoPagado) - n(c.interes));
      const interesPend = r2(n(c.interes) - interesPagado);
      const capitalPend = r2(n(c.capital) - capitalPagado);
      const impago = r2(n(c.montoCuota) - n(c.montoPagado));
      const moraViva =
        impago > 0 ? calcularMora(impago, venc, hoy, tasaPunit, p.diasGracia) + n(c.moraAcumulada) : 0;

      const imp = imputarPago(restante, { mora: r2(moraViva), interes: interesPend, capital: capitalPend });
      restante = imp.sobrante;
      totMora += imp.aMora; totInteres += imp.aInteres; totCapital += imp.aCapital;

      const nuevoPagado = r2(n(c.montoPagado) + imp.aInteres + imp.aCapital);
      const moraRestante = r2(moraViva - imp.aMora);
      const cubierta = nuevoPagado >= n(c.montoCuota) - 0.01 && moraRestante <= 0.01;
      const estado: EstadoCuota = cubierta ? 'pagada' : nuevoPagado > 0 ? 'parcial' : c.estado;

      await tx
        .update(cuotas)
        .set({
          montoPagado: nuevoPagado.toFixed(2),
          moraAcumulada: moraRestante.toFixed(2),
          estado,
          pagadaAt: cubierta ? new Date() : c.pagadaAt,
        })
        .where(eq(cuotas.id, c.id));
    }

    await tx.insert(pagosPrestamo).values({
      tenantId: session.tenantId,
      prestamoId: p.id,
      clienteId: p.clienteId,
      usuarioId: session.userId,
      montoTotal: monto.toFixed(2),
      aMora: r2(totMora).toFixed(2),
      aInteres: r2(totInteres).toFixed(2),
      aCapital: r2(totCapital).toFixed(2),
      metodo: input.metodo,
      referencia: input.referencia ?? null,
    });

    // Recalcular estado del préstamo
    const [restantes] = await tx
      .select({ pendientes: sql<number>`count(*)::int`, vencidas: sql<number>`count(*) filter (where ${cuotas.vencimiento} < now()::date)::int` })
      .from(cuotas)
      .where(and(eq(cuotas.prestamoId, p.id), sql`${cuotas.estado} <> 'pagada'`));
    const nuevoEstado = !restantes || restantes.pendientes === 0 ? 'cancelado' : restantes.vencidas > 0 ? 'en_mora' : 'vigente';
    await tx.update(prestamos).set({ estado: nuevoEstado }).where(eq(prestamos.id, p.id));
  });

  revalidatePath('/dashboard/prestamos');
  return { ok: true as const };
}

// ─── Dashboard de cartera ────────────────────────────────────────────────────
export async function dashboardPrestamos() {
  const session = await requireSession();
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [totales] = await db
    .select({
      totalPrestado: sql<string>`coalesce(sum(${prestamos.capital}), 0)`,
      activos: sql<number>`count(*) filter (where ${prestamos.estado} in ('vigente','en_mora'))::int`,
      enMora: sql<number>`count(*) filter (where ${prestamos.estado} = 'en_mora')::int`,
    })
    .from(prestamos)
    .where(and(byTenant(session.tenantId, prestamos), isNull(prestamos.deletedAt)));

  const [aCobrar] = await db
    .select({ saldo: sql<string>`coalesce(sum(${cuotas.montoCuota} - ${cuotas.montoPagado}), 0)` })
    .from(cuotas)
    .where(and(byTenant(session.tenantId, cuotas), sql`${cuotas.estado} <> 'pagada'`));

  const [cobradoMes] = await db
    .select({ total: sql<string>`coalesce(sum(${pagosPrestamo.montoTotal}), 0)` })
    .from(pagosPrestamo)
    .where(and(byTenant(session.tenantId, pagosPrestamo), isNull(pagosPrestamo.anuladoAt), gte(pagosPrestamo.fecha, inicioMes)));

  return {
    totalPrestado: totales?.totalPrestado ?? '0',
    activos: totales?.activos ?? 0,
    enMora: totales?.enMora ?? 0,
    aCobrar: aCobrar?.saldo ?? '0',
    cobradoMes: cobradoMes?.total ?? '0',
  };
}
