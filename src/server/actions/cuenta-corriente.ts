'use server';

import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  movimientosCuentaCorriente, pagos, clientes,
  type MetodoPago,
} from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requireSession } from '@/server/auth/session';
import { revalidatePath } from 'next/cache';

export async function listarMovimientosCliente(clienteId: string) {
  const session = await requireSession();

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
  const session = await requireSession();
  const monto = Number(input.monto);
  if (isNaN(monto) || monto <= 0) throw new Error('Monto inválido');

  await db.transaction(async (tx) => {
    const [cliente] = await tx
      .select({ saldo: clientes.saldoActual })
      .from(clientes)
      .where(and(byTenant(session.tenantId, clientes), eq(clientes.id, input.clienteId)))
      .limit(1);

    if (!cliente) throw new Error('Cliente no encontrado');

    const saldoAnterior = Number(cliente.saldo ?? 0);
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
