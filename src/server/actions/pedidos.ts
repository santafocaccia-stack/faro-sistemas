'use server';

import { eq, and, asc, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import {
  pedidosProveedores, pedidosLineas, proveedores, productos,
} from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requireAdmin } from '@/server/auth/session';

export async function listarPedidos() {
  const session = await requireAdmin();
  const rows = await db
    .select({
      pedido: pedidosProveedores,
      proveedorNombre: proveedores.nombre,
    })
    .from(pedidosProveedores)
    .innerJoin(proveedores, eq(pedidosProveedores.proveedorId, proveedores.id))
    .where(byTenant(session.tenantId, pedidosProveedores))
    .orderBy(desc(pedidosProveedores.createdAt));

  return rows;
}

export async function obtenerPedido(id: string) {
  const session = await requireAdmin();

  const [row] = await db
    .select({
      pedido: pedidosProveedores,
      proveedor: proveedores,
    })
    .from(pedidosProveedores)
    .innerJoin(proveedores, eq(pedidosProveedores.proveedorId, proveedores.id))
    .where(and(byTenant(session.tenantId, pedidosProveedores), eq(pedidosProveedores.id, id)))
    .limit(1);

  if (!row) return null;

  const lineas = await db
    .select({
      linea: pedidosLineas,
      productoNombre: productos.nombre,
      tipoUnidad: productos.tipoUnidad,
    })
    .from(pedidosLineas)
    .innerJoin(productos, eq(pedidosLineas.productoId, productos.id))
    .where(and(byTenant(session.tenantId, pedidosLineas), eq(pedidosLineas.pedidoId, id)))
    .orderBy(asc(productos.nombre));

  return { ...row, lineas };
}

export async function actualizarLineaPedido(lineaId: string, cantidad: string) {
  const session = await requireAdmin();
  await db
    .update(pedidosLineas)
    .set({ cantidadPedida: cantidad })
    .where(and(byTenant(session.tenantId, pedidosLineas), eq(pedidosLineas.id, lineaId)));
  revalidatePath('/dashboard/pedidos');
}

export async function eliminarLineaPedido(lineaId: string) {
  const session = await requireAdmin();
  await db
    .delete(pedidosLineas)
    .where(and(byTenant(session.tenantId, pedidosLineas), eq(pedidosLineas.id, lineaId)));
  revalidatePath('/dashboard/pedidos');
}

export async function confirmarPedido(id: string, notas?: string) {
  const session = await requireAdmin();
  await db
    .update(pedidosProveedores)
    .set({
      estado: 'enviado',
      notas: notas || null,
      enviadoAt: new Date(),
    })
    .where(and(byTenant(session.tenantId, pedidosProveedores), eq(pedidosProveedores.id, id)));
  revalidatePath('/dashboard/pedidos');
  revalidatePath(`/dashboard/pedidos/${id}`);
}

export async function recibirPedido(
  id: string,
  lineas: { lineaId: string; cantidadRecibida: string }[],
) {
  const session = await requireAdmin();

  await db.transaction(async (tx) => {
    // Marcar el pedido como recibido
    await tx
      .update(pedidosProveedores)
      .set({ estado: 'recibido', recibidoAt: new Date() })
      .where(and(byTenant(session.tenantId, pedidosProveedores), eq(pedidosProveedores.id, id)));

    // Verificar que el pedido pertenece a este tenant
    const [pedido] = await tx
      .select({ id: pedidosProveedores.id })
      .from(pedidosProveedores)
      .where(and(byTenant(session.tenantId, pedidosProveedores), eq(pedidosProveedores.id, id)))
      .limit(1);

    if (!pedido) throw new Error('Pedido no encontrado');

    // Actualizar cantidades recibidas + sumar al stock
    for (const l of lineas) {
      const cantidad = Number(l.cantidadRecibida);
      if (cantidad <= 0) continue;

      await tx
        .update(pedidosLineas)
        .set({ cantidadRecibida: l.cantidadRecibida })
        .where(and(byTenant(session.tenantId, pedidosLineas), eq(pedidosLineas.id, l.lineaId)));

      // Traer productoId de la línea — filtrando por tenant (la línea viene del
      // input del cliente; sin byTenant un lineaId de otro tenant se colaría).
      const [linea] = await tx
        .select({ productoId: pedidosLineas.productoId })
        .from(pedidosLineas)
        .where(and(byTenant(session.tenantId, pedidosLineas), eq(pedidosLineas.id, l.lineaId)))
        .limit(1);

      if (linea?.productoId) {
        await tx
          .update(productos)
          .set({
            stockActual: sql`${productos.stockActual} + ${l.cantidadRecibida}::numeric`,
          })
          .where(and(byTenant(session.tenantId, productos), eq(productos.id, linea.productoId)));
      }
    }
  });

  revalidatePath('/dashboard/pedidos');
  revalidatePath(`/dashboard/pedidos/${id}`);
  revalidatePath('/dashboard/productos');
}
