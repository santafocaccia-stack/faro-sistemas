'use server';

import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  ventas, ventasLineas, pagos, movimientosCuentaCorriente, clientes, productos,
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

    // Descontar stock de productos (solo los que tienen productoId)
    for (const l of input.lineas) {
      if (!l.productoId) continue;
      await tx
        .update(productos)
        .set({ stockActual: sql`${productos.stockActual} - ${l.cantidad}::numeric` })
        .where(and(byTenant(session.tenantId, productos), eq(productos.id, l.productoId)));
    }

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

export async function anularVenta(id: string) {
  const session = await requireSession();

  await db.transaction(async (tx) => {
    // Traer la venta
    const result = await tx
      .select()
      .from(ventas)
      .where(and(byTenant(session.tenantId, ventas), eq(ventas.id, id)))
      .limit(1);

    const venta = result[0];
    if (!venta) throw new Error('Venta no encontrada');
    if (venta.estado === 'anulada') throw new Error('La venta ya está anulada');

    const lineas = await tx
      .select()
      .from(ventasLineas)
      .where(eq(ventasLineas.ventaId, id));

    // 1. Marcar anulada
    await tx
      .update(ventas)
      .set({ estado: 'anulada', anuladaAt: new Date() })
      .where(eq(ventas.id, id));

    // 2. Revertir stock (sumar cantidad de vuelta)
    for (const l of lineas) {
      if (!l.productoId) continue;
      await tx
        .update(productos)
        .set({ stockActual: sql`${productos.stockActual} + ${l.cantidad}::numeric` })
        .where(and(byTenant(session.tenantId, productos), eq(productos.id, l.productoId)));
    }

    // 3. Si era cuenta corriente, emitir nota de crédito en el libro mayor
    if (venta.tipoPago === 'cuenta_corriente') {
      const saldoResult = await tx
        .select({ saldo: clientes.saldoActual })
        .from(clientes)
        .where(and(byTenant(session.tenantId, clientes), eq(clientes.id, venta.clienteId)))
        .limit(1);

      const saldoAnterior = Number(saldoResult[0]?.saldo ?? 0);
      const saldoPosterior = saldoAnterior - Number(venta.total);

      await tx.insert(movimientosCuentaCorriente).values({
        tenantId:       session.tenantId,
        clienteId:      venta.clienteId,
        tipo:           'nota_credito',
        ventaId:        venta.id,
        usuarioId:      session.userId,
        debe:           '0',
        haber:          venta.total,
        saldoPosterior: saldoPosterior.toFixed(2),
        descripcion:    `Anulación venta ${venta.canal} #${venta.numero}`,
      });

      await tx
        .update(clientes)
        .set({ saldoActual: saldoPosterior.toFixed(2) })
        .where(and(byTenant(session.tenantId, clientes), eq(clientes.id, venta.clienteId)));
    }
  });

  revalidatePath(`/dashboard/ventas/historial/${id}`);
  revalidatePath('/dashboard/ventas/historial');
  revalidatePath('/dashboard/clientes');
  revalidatePath('/dashboard');
}

export async function obtenerVenta(id: string) {
  const session = await requireSession();
  const [row] = await db
    .select({ venta: ventas, clienteNombre: clientes.razonSocial })
    .from(ventas)
    .leftJoin(clientes, eq(ventas.clienteId, clientes.id))
    .where(and(byTenant(session.tenantId, ventas), eq(ventas.id, id)))
    .limit(1);
  if (!row) return null;

  const [lineas, pagoRow] = await Promise.all([
    db.select().from(ventasLineas).where(eq(ventasLineas.ventaId, id)),
    db.select({ metodo: pagos.metodo }).from(pagos).where(eq(pagos.ventaId, id)).limit(1),
  ]);

  const metodoPago = pagoRow[0]?.metodo ?? null;

  return { ...row, lineas, metodoPago };
}
