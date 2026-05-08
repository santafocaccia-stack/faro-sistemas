'use server';

import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  ventas, ventasLineas, pagos, movimientosCuentaCorriente, clientes,
  type CanalVenta, type MetodoPago,
} from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requireSession } from '@/server/auth/session';
import { revalidatePath } from 'next/cache';

export type LineaVenta = {
  productoId: string | null;
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
  subtotal: string;
};

export type NuevaVentaInput = {
  canal: CanalVenta;
  clienteId: string;
  tipoPago: 'contado' | 'cuenta_corriente';
  metodoPago?: MetodoPago;
  lineas: LineaVenta[];
  descuento?: string;
  notas?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function siguienteNumero(tenantId: string, canal: CanalVenta, tx: any): Promise<number> {
  const [row] = await tx
    .select({ max: sql<number>`coalesce(max(${ventas.numero}), 0)` })
    .from(ventas)
    .where(and(byTenant(tenantId, ventas), eq(ventas.canal, canal)));
  return (row?.max ?? 0) + 1;
}

export async function crearVenta(input: NuevaVentaInput) {
  const session = await requireSession();

  const subtotal = input.lineas.reduce((a, l) => a + Number(l.subtotal), 0);
  const descuento = Number(input.descuento ?? 0);
  const total = subtotal - descuento;

  await db.transaction(async (tx) => {
    const numero = await siguienteNumero(session.tenantId, input.canal, tx);

    const esCuentaCorriente = input.tipoPago === 'cuenta_corriente';

    const [venta] = await tx.insert(ventas).values({
      tenantId: session.tenantId,
      numero,
      canal: input.canal,
      clienteId: input.clienteId,
      usuarioId: session.userId,
      tipoPago: input.tipoPago,
      estado: esCuentaCorriente ? 'pendiente' : 'pagada',
      subtotal: subtotal.toFixed(2),
      descuento: descuento.toFixed(2),
      total: total.toFixed(2),
      montoPagado: esCuentaCorriente ? '0' : total.toFixed(2),
      notas: input.notas ?? null,
    }).returning({ id: ventas.id });

    if (!venta) throw new Error('No se pudo crear la venta');

    // Líneas
    await tx.insert(ventasLineas).values(
      input.lineas.map((l) => ({
        tenantId: session.tenantId,
        ventaId: venta.id,
        productoId: l.productoId,
        descripcion: l.descripcion,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
        subtotal: l.subtotal,
      }))
    );

    if (!esCuentaCorriente && input.metodoPago) {
      // Pago contado
      await tx.insert(pagos).values({
        tenantId: session.tenantId,
        clienteId: input.clienteId,
        ventaId: venta.id,
        usuarioId: session.userId,
        monto: total.toFixed(2),
        metodo: input.metodoPago,
      });
    } else if (esCuentaCorriente) {
      // Cuenta corriente — obtener saldo actual del cliente
      const [cliente] = await tx
        .select({ saldo: clientes.saldoActual })
        .from(clientes)
        .where(and(byTenant(session.tenantId, clientes), eq(clientes.id, input.clienteId)))
        .limit(1);

      const saldoAnterior = Number(cliente?.saldo ?? 0);
      const saldoPosterior = saldoAnterior + total;

      await tx.insert(movimientosCuentaCorriente).values({
        tenantId: session.tenantId,
        clienteId: input.clienteId,
        tipo: 'venta',
        ventaId: venta.id,
        usuarioId: session.userId,
        debe: total.toFixed(2),
        haber: '0',
        saldoPosterior: saldoPosterior.toFixed(2),
        descripcion: `Venta ${input.canal} #${numero}`,
      });

      // Actualizar saldo cacheado del cliente
      await tx.update(clientes)
        .set({ saldoActual: saldoPosterior.toFixed(2) })
        .where(and(byTenant(session.tenantId, clientes), eq(clientes.id, input.clienteId)));
    }
  });

  revalidatePath(`/dashboard/ventas/${input.canal}`);
  revalidatePath('/dashboard/clientes');
}

export async function listarVentas(canal: CanalVenta) {
  const session = await requireSession();
  const rows = await db
    .select({
      venta: ventas,
      clienteNombre: clientes.razonSocial,
    })
    .from(ventas)
    .leftJoin(clientes, eq(ventas.clienteId, clientes.id))
    .where(and(byTenant(session.tenantId, ventas), eq(ventas.canal, canal)))
    .orderBy(sql`${ventas.fecha} desc`)
    .limit(100);
  return rows;
}
