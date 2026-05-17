'use server';

import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  ventas, ventasLineas, pagos, movimientosCuentaCorriente, clientes, productos,
  productoProveedores, pedidosProveedores, pedidosLineas,
  type CanalVenta, type MetodoPago,
} from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requireSession } from '@/server/auth/session';
import { revalidatePath } from 'next/cache';
import { calcularTotalesVenta, validarLimiteCredito } from '@/lib/business-logic';
import { nuevaVentaSchema, formatZodError } from '@/server/schemas';
import { z } from 'zod';

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
  const parsed = nuevaVentaSchema.safeParse(input);
  if (!parsed.success) throw new Error(formatZodError(parsed.error));
  // input ya está validado; seguimos usando `input` para no romper tipos downstream

  const { subtotal, descuento, total } = calcularTotalesVenta(
    input.lineas,
    Number(input.descuento ?? 0),
  );

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

    // Descontar stock + acumular carrito de pedidos al proveedor principal
    for (const l of input.lineas) {
      if (!l.productoId) continue;

      await tx
        .update(productos)
        .set({ stockActual: sql`${productos.stockActual} - ${l.cantidad}::numeric` })
        .where(and(byTenant(session.tenantId, productos), eq(productos.id, l.productoId)));

      // Buscar proveedor principal del producto
      const [relProv] = await tx
        .select({ proveedorId: productoProveedores.proveedorId })
        .from(productoProveedores)
        .where(
          and(
            byTenant(session.tenantId, productoProveedores),
            eq(productoProveedores.productoId, l.productoId),
            eq(productoProveedores.esPrincipal, true),
          ),
        )
        .limit(1);

      if (!relProv) continue;

      // Buscar o crear pedido en borrador para este proveedor
      const [pedidoExistente] = await tx
        .select({ id: pedidosProveedores.id })
        .from(pedidosProveedores)
        .where(
          and(
            byTenant(session.tenantId, pedidosProveedores),
            eq(pedidosProveedores.proveedorId, relProv.proveedorId),
            eq(pedidosProveedores.estado, 'borrador'),
          ),
        )
        .limit(1);

      let pedidoId: string;
      if (pedidoExistente) {
        pedidoId = pedidoExistente.id;
      } else {
        const [nuevoPedido] = await tx
          .insert(pedidosProveedores)
          .values({
            tenantId: session.tenantId,
            proveedorId: relProv.proveedorId,
            estado: 'borrador',
          })
          .returning({ id: pedidosProveedores.id });
        pedidoId = nuevoPedido!.id;
      }

      // Upsert: acumular cantidad en la línea de pedido
      const [lineaExistente] = await tx
        .select({ id: pedidosLineas.id })
        .from(pedidosLineas)
        .where(
          and(
            byTenant(session.tenantId, pedidosLineas),
            eq(pedidosLineas.pedidoId, pedidoId),
            eq(pedidosLineas.productoId, l.productoId),
          ),
        )
        .limit(1);

      if (lineaExistente) {
        await tx
          .update(pedidosLineas)
          .set({ cantidadPedida: sql`${pedidosLineas.cantidadPedida} + ${l.cantidad}::numeric` })
          .where(eq(pedidosLineas.id, lineaExistente.id));
      } else {
        await tx.insert(pedidosLineas).values({
          tenantId: session.tenantId,
          pedidoId,
          productoId: l.productoId,
          cantidadPedida: l.cantidad,
        });
      }
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
      // Cuenta corriente — obtener saldo actual y límite del cliente
      const [cliente] = await tx
        .select({ saldo: clientes.saldoActual, limiteCredito: clientes.limiteCredito })
        .from(clientes)
        .where(and(byTenant(session.tenantId, clientes), eq(clientes.id, input.clienteId)))
        .limit(1);

      const saldoAnterior = Number(cliente?.saldo ?? 0);
      const saldoPosterior = saldoAnterior + total;

      // Validar límite de crédito si está configurado
      validarLimiteCredito(saldoAnterior, total, Number(cliente?.limiteCredito ?? 0));

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

const PAGE_SIZE = 30;

export async function listarVentas(canal: CanalVenta, page = 0) {
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
    .limit(PAGE_SIZE + 1)
    .offset(page * PAGE_SIZE);

  const hayMas = rows.length > PAGE_SIZE;
  return { rows: rows.slice(0, PAGE_SIZE), hayMas, page };
}

export async function anularVenta(id: string) {
  const session = await requireSession();
  const parsedId = z.string().uuid('ID inválido').safeParse(id);
  if (!parsedId.success) throw new Error(formatZodError(parsedId.error));

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

  // Traer líneas y pago verificando tenant via join con la venta ya validada
  const [lineasRows, pagoRow] = await Promise.all([
    db
      .select({ l: ventasLineas })
      .from(ventasLineas)
      .innerJoin(ventas, and(eq(ventasLineas.ventaId, ventas.id), byTenant(session.tenantId, ventas)))
      .where(eq(ventasLineas.ventaId, id)),
    db
      .select({ metodo: pagos.metodo })
      .from(pagos)
      .innerJoin(ventas, and(eq(pagos.ventaId, ventas.id), byTenant(session.tenantId, ventas)))
      .where(eq(pagos.ventaId, id))
      .limit(1),
  ]);
  const lineas = lineasRows.map((r) => r.l);

  const metodoPago = pagoRow[0]?.metodo ?? null;

  return { ...row, lineas, metodoPago };
}
