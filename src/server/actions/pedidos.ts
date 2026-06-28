'use server';

import { eq, and, asc, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import {
  pedidosProveedores, pedidosLineas, proveedores, productos, productoProveedores,
} from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requirePermiso } from '@/server/auth/session';

/**
 * Crea (o reutiliza) un pedido en borrador para un proveedor y lo pre-carga con
 * los productos vinculados a ese proveedor (cantidad 0, para que el usuario las
 * ajuste). Los pedidos normalmente se acumulan solos al vender; esto permite
 * armar uno a mano. Devuelve el id del pedido.
 */
export async function crearPedidoManual(proveedorId: string): Promise<string> {
  const session = await requirePermiso('gestionar_proveedores');
  const { tenantId } = session;

  // Verificar que el proveedor sea del tenant (byTenant = defensa principal).
  const [prov] = await db
    .select({ id: proveedores.id })
    .from(proveedores)
    .where(and(byTenant(tenantId, proveedores), eq(proveedores.id, proveedorId)))
    .limit(1);
  if (!prov) throw new Error('Proveedor no encontrado');

  // Reutilizar el borrador abierto del proveedor para no duplicar.
  const [existente] = await db
    .select({ id: pedidosProveedores.id })
    .from(pedidosProveedores)
    .where(and(
      byTenant(tenantId, pedidosProveedores),
      eq(pedidosProveedores.proveedorId, proveedorId),
      eq(pedidosProveedores.estado, 'borrador'),
    ))
    .limit(1);

  let pedidoId = existente?.id;
  if (!pedidoId) {
    const [nuevo] = await db
      .insert(pedidosProveedores)
      .values({ tenantId, proveedorId })
      .returning({ id: pedidosProveedores.id });
    pedidoId = nuevo!.id;
  }

  // Pre-cargar los productos vinculados al proveedor que no estén ya en el pedido.
  const vinculados = await db
    .select({ productoId: productoProveedores.productoId })
    .from(productoProveedores)
    .innerJoin(productos, eq(productoProveedores.productoId, productos.id))
    .where(and(
      byTenant(tenantId, productoProveedores),
      eq(productoProveedores.proveedorId, proveedorId),
      eq(productos.activo, true),
    ));

  const yaEnPedido = new Set(
    (await db
      .select({ productoId: pedidosLineas.productoId })
      .from(pedidosLineas)
      .where(and(byTenant(tenantId, pedidosLineas), eq(pedidosLineas.pedidoId, pedidoId))))
      .map((r) => r.productoId),
  );

  const nuevas = vinculados.filter((v) => !yaEnPedido.has(v.productoId));
  if (nuevas.length > 0) {
    await db.insert(pedidosLineas).values(
      nuevas.map((v) => ({ tenantId, pedidoId: pedidoId!, productoId: v.productoId, cantidadPedida: '0' })),
    );
  }

  revalidatePath('/dashboard/pedidos');
  return pedidoId;
}

/** Action para usar en un <form>: crea el pedido y redirige a su detalle. */
export async function nuevoPedido(formData: FormData) {
  const proveedorId = String(formData.get('proveedorId') ?? '');
  if (!proveedorId) return;
  const id = await crearPedidoManual(proveedorId);
  redirect(`/dashboard/pedidos/${id}`);
}

export async function listarPedidos() {
  const session = await requirePermiso('gestionar_proveedores');
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
  const session = await requirePermiso('gestionar_proveedores');

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
  const session = await requirePermiso('gestionar_proveedores');
  await db
    .update(pedidosLineas)
    .set({ cantidadPedida: cantidad })
    .where(and(byTenant(session.tenantId, pedidosLineas), eq(pedidosLineas.id, lineaId)));
  revalidatePath('/dashboard/pedidos');
}

export async function eliminarLineaPedido(lineaId: string) {
  const session = await requirePermiso('gestionar_proveedores');
  await db
    .delete(pedidosLineas)
    .where(and(byTenant(session.tenantId, pedidosLineas), eq(pedidosLineas.id, lineaId)));
  revalidatePath('/dashboard/pedidos');
}

export async function confirmarPedido(id: string, notas?: string) {
  const session = await requirePermiso('gestionar_proveedores');
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
  const session = await requirePermiso('gestionar_proveedores');

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
