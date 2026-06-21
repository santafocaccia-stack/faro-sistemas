'use server';

import { eq, and, sql, ilike } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  movimientosCuentaCorriente, pagos, clientes,
  type MetodoPago,
} from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requireAdmin } from '@/server/auth/session';
import { revalidatePath } from 'next/cache';

export async function listarMovimientosCliente(clienteId: string) {
  const session = await requireAdmin();

  // Verificar que el cliente pertenece a este tenant antes de retornar sus movimientos
  const [clienteExiste] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(and(byTenant(session.tenantId, clientes), eq(clientes.id, clienteId)))
    .limit(1);
  if (!clienteExiste) throw new Error('Cliente no encontrado');

  const rows = await db
    .select()
    .from(movimientosCuentaCorriente)
    .where(
      and(
        byTenant(session.tenantId, movimientosCuentaCorriente),
        eq(movimientosCuentaCorriente.clienteId, clienteId),
      )
    )
    .orderBy(sql`${movimientosCuentaCorriente.fecha} desc`)
    .limit(200);
  return rows;
}

export async function registrarPago(input: {
  clienteId: string;
  monto: string;
  metodo: MetodoPago;
  referencia?: string;
  notas?: string;
}) {
  const session = await requireAdmin();
  const monto = Number(input.monto);
  if (isNaN(monto) || monto <= 0) throw new Error('Monto inválido');

  await db.transaction(async (tx) => {
    const [cliente] = await tx
      .select({ saldo: clientes.saldoActual })
      .from(clientes)
      .where(and(byTenant(session.tenantId, clientes), eq(clientes.id, input.clienteId)))
      .limit(1)
      .for('update'); // evita race condition con pagos simultáneos

    if (!cliente) throw new Error('Cliente no encontrado');

    const saldoAnterior = Number(cliente.saldo ?? 0);
    // Convención: saldo positivo = el cliente debe. Un pago no puede dejar
    // saldo negativo (crédito a favor sin respaldo); se topea en la deuda real.
    if (saldoAnterior <= 0) {
      throw new Error('Este cliente no tiene deuda pendiente.');
    }
    if (monto > saldoAnterior) {
      throw new Error(`El pago ($${monto.toLocaleString('es-AR')}) supera la deuda actual ($${saldoAnterior.toLocaleString('es-AR')}).`);
    }
    const saldoPosterior = saldoAnterior - monto;

    const [pago] = await tx.insert(pagos).values({
      tenantId: session.tenantId,
      clienteId: input.clienteId,
      usuarioId: session.userId,
      monto: monto.toFixed(2),
      metodo: input.metodo,
      referencia: input.referencia ?? null,
      notas: input.notas ?? null,
    }).returning({ id: pagos.id });

    if (!pago) throw new Error('No se pudo registrar el pago');

    await tx.insert(movimientosCuentaCorriente).values({
      tenantId: session.tenantId,
      clienteId: input.clienteId,
      tipo: 'pago',
      pagoId: pago.id,
      usuarioId: session.userId,
      debe: '0',
      haber: monto.toFixed(2),
      saldoPosterior: saldoPosterior.toFixed(2),
      descripcion: `Pago recibido — ${input.metodo}${input.referencia ? ` (${input.referencia})` : ''}`,
    });

    await tx.update(clientes)
      .set({ saldoActual: saldoPosterior.toFixed(2) })
      .where(and(byTenant(session.tenantId, clientes), eq(clientes.id, input.clienteId)));
  });

  revalidatePath(`/dashboard/cc/${input.clienteId}`);
  revalidatePath('/dashboard/cc');
  revalidatePath('/dashboard/clientes');
}

/* ── Tipos revertibles ─────────────────────────────────────────────────────── */

/** Solo estos movimientos pueden revertirse. Las ventas se anulan desde la
 *  pantalla de ventas; los ajustes de debe se compensan con un nuevo haber. */
const TIPOS_REVERTIBLES = new Set(['pago', 'ajuste_haber', 'nota_credito'] as const);

export async function revertirMovimiento(input: {
  movimientoId: string;
  motivo: string;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdmin();

  if (!input.motivo?.trim()) {
    return { ok: false, error: 'Indicá el motivo de la reversión' };
  }

  let clienteId: string | undefined;

  try {
    await db.transaction(async (tx) => {
      // 1. Obtener y lockear el movimiento original
      const [mov] = await tx
        .select()
        .from(movimientosCuentaCorriente)
        .where(
          and(
            byTenant(session.tenantId, movimientosCuentaCorriente),
            eq(movimientosCuentaCorriente.id, input.movimientoId),
          )
        )
        .limit(1)
        .for('update');

      if (!mov) throw new Error('Movimiento no encontrado');
      clienteId = mov.clienteId;

      // 2. Solo se revierten ciertos tipos
      if (!TIPOS_REVERTIBLES.has(mov.tipo as any)) {
        throw new Error(`Los movimientos de tipo "${mov.tipo}" no se pueden revertir`);
      }

      // 3. Verificar que no fue revertido antes (búsqueda por descripción)
      const [yaRevertido] = await tx
        .select({ id: movimientosCuentaCorriente.id })
        .from(movimientosCuentaCorriente)
        .where(
          and(
            byTenant(session.tenantId, movimientosCuentaCorriente),
            eq(movimientosCuentaCorriente.clienteId, mov.clienteId),
            ilike(movimientosCuentaCorriente.descripcion, `REV-${input.movimientoId}%`),
          )
        )
        .limit(1);

      if (yaRevertido) throw new Error('Este movimiento ya fue revertido');

      // 4. Calcular monto (el original siempre tiene haber > 0 para los tipos revertibles)
      const haber = Number(mov.haber ?? 0);
      const debe  = Number(mov.debe  ?? 0);
      const monto = haber > 0 ? haber : debe;
      if (monto <= 0) throw new Error('El movimiento no tiene monto válido para revertir');

      // 5. Lockear saldo del cliente
      const [cliente] = await tx
        .select({ saldo: clientes.saldoActual })
        .from(clientes)
        .where(and(byTenant(session.tenantId, clientes), eq(clientes.id, mov.clienteId)))
        .limit(1)
        .for('update');

      if (!cliente) throw new Error('Cliente no encontrado');

      // 6. Si el original redujo la deuda (haber > 0), la reversión la aumenta
      const nuevoSaldo = haber > 0
        ? Number(cliente.saldo ?? 0) + monto  // reversión de haber → debe
        : Number(cliente.saldo ?? 0) - monto; // reversión de debe  → haber

      await tx
        .update(clientes)
        .set({ saldoActual: nuevoSaldo.toFixed(2) })
        .where(and(byTenant(session.tenantId, clientes), eq(clientes.id, mov.clienteId)));

      // 7. Insertar movimiento compensatorio (inmutable — nunca se borra)
      await tx.insert(movimientosCuentaCorriente).values({
        tenantId:      session.tenantId,
        clienteId:     mov.clienteId,
        usuarioId:     session.userId,
        tipo:          haber > 0 ? 'nota_debito' : 'nota_credito',
        debe:          haber > 0 ? monto.toFixed(2) : '0',
        haber:         haber > 0 ? '0' : monto.toFixed(2),
        saldoPosterior: nuevoSaldo.toFixed(2),
        descripcion:   `REV-${input.movimientoId} — ${input.motivo.trim()} (por ${session.email})`,
      });
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error al revertir el movimiento' };
  }

  if (clienteId) {
    revalidatePath(`/dashboard/cc/${clienteId}`);
    revalidatePath('/dashboard/cc');
  }

  return { ok: true };
}
