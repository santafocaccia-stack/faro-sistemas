'use server';

import { eq, and, asc, desc, lt } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  pedidosAtmosfericos, clientes,
  type EstadoPedidoAtmos,
} from '@/server/db/schema';
import { byTenant, byTenantAnd } from '@/server/db/tenant-context';
import { requireSession, requirePermiso } from '@/server/auth/session';
import { revalidatePath } from 'next/cache';

const RUTA = '/dashboard/atmosfericos';

export type PedidoAtmosInput = {
  clienteId?: string | null;
  nombreContacto?: string | null;
  direccion: string;
  localidad?: string | null;
  referencias?: string | null;
  mapsLink?: string | null;
  fechaProgramada: string; // YYYY-MM-DD
  litrosPozo?: string | null;
  notas?: string | null;
  asignadoA?: string | null;
};

export type PedidoAtmosCompletarInput = {
  litrosPozo?: string | null;
  litrosExtraidos?: string | null;
  montoCobrado: string;
  metodoPago?: string | null;
  notas?: string | null;
  guardarLitrosEnCliente?: boolean;
};

/** Lista de pedidos del día, ordenados por ruta */
export async function listarPedidosDelDia(fecha?: string) {
  const session = await requireSession();
  const hoy = fecha ?? new Date().toISOString().slice(0, 10);

  const rows = await db
    .select({
      id:              pedidosAtmosfericos.id,
      clienteId:       pedidosAtmosfericos.clienteId,
      nombreContacto:  pedidosAtmosfericos.nombreContacto,
      direccion:       pedidosAtmosfericos.direccion,
      localidad:       pedidosAtmosfericos.localidad,
      referencias:     pedidosAtmosfericos.referencias,
      mapsLink:        pedidosAtmosfericos.mapsLink,
      orden:           pedidosAtmosfericos.orden,
      estado:          pedidosAtmosfericos.estado,
      fechaProgramada: pedidosAtmosfericos.fechaProgramada,
      litrosPozo:      pedidosAtmosfericos.litrosPozo,
      litrosExtraidos: pedidosAtmosfericos.litrosExtraidos,
      montoCobrado:    pedidosAtmosfericos.montoCobrado,
      metodoPago:      pedidosAtmosfericos.metodoPago,
      notas:           pedidosAtmosfericos.notas,
      completadoAt:    pedidosAtmosfericos.completadoAt,
      // Cliente relacionado
      clienteNombre:   clientes.razonSocial,
      clienteDireccion: clientes.direccion,
      clienteLocalidad: clientes.localidad,
      clienteLitrosPozo: clientes.litrosPozoEstimado,
      clienteTelefono: clientes.telefono,
    })
    .from(pedidosAtmosfericos)
    .leftJoin(clientes, eq(pedidosAtmosfericos.clienteId, clientes.id))
    .where(
      and(
        byTenant(session.tenantId, pedidosAtmosfericos),
        eq(pedidosAtmosfericos.fechaProgramada, hoy),
        eq(pedidosAtmosfericos.activo, true),
      )
    )
    .orderBy(asc(pedidosAtmosfericos.orden));

  return rows;
}

export type PedidoDelDia = Awaited<ReturnType<typeof listarPedidosDelDia>>[number];

/** Crear un nuevo pedido */
export async function crearPedido(input: PedidoAtmosInput) {
  const session = await requirePermiso('gestionar_atmosfericos');

  // Calcular el próximo orden (al final de la lista del día)
  const existentes = await db
    .select({ orden: pedidosAtmosfericos.orden })
    .from(pedidosAtmosfericos)
    .where(
      and(
        byTenant(session.tenantId, pedidosAtmosfericos),
        eq(pedidosAtmosfericos.fechaProgramada, input.fechaProgramada),
        eq(pedidosAtmosfericos.activo, true),
      )
    )
    .orderBy(desc(pedidosAtmosfericos.orden))
    .limit(1);

  const siguienteOrden = existentes.length > 0 ? (existentes[0]!.orden + 1) : 0;

  // Si tiene cliente, pre-llenar dirección y litros si no se proveyeron
  let direccion = input.direccion;
  let localidad = input.localidad;
  let litrosPozo = input.litrosPozo;

  if (input.clienteId) {
    const [cliente] = await db
      .select()
      .from(clientes)
      .where(and(byTenant(session.tenantId, clientes), eq(clientes.id, input.clienteId)))
      .limit(1);

    if (cliente) {
      if (!direccion && cliente.direccion) direccion = cliente.direccion;
      if (!localidad && cliente.localidad) localidad = cliente.localidad;
      if (!litrosPozo && cliente.litrosPozoEstimado) litrosPozo = cliente.litrosPozoEstimado;
    }
  }

  const [creado] = await db
    .insert(pedidosAtmosfericos)
    .values({
      tenantId:       session.tenantId,
      clienteId:      input.clienteId ?? null,
      nombreContacto: input.nombreContacto ?? null,
      direccion,
      localidad:      localidad ?? null,
      referencias:    input.referencias ?? null,
      mapsLink:       input.mapsLink?.trim() || null,
      fechaProgramada: input.fechaProgramada,
      litrosPozo:     litrosPozo ?? null,
      notas:          input.notas ?? null,
      asignadoA:      input.asignadoA ?? null,
      orden:          siguienteOrden,
    })
    .returning({ id: pedidosAtmosfericos.id });

  revalidatePath(RUTA);
  return creado;
}

/** Reordenar los pedidos del día — recibe array de ids en el nuevo orden */
export async function reordenarPedidos(ids: string[], fecha: string) {
  const session = await requirePermiso('gestionar_atmosfericos');

  // Actualizar el orden de cada pedido en una transacción
  await db.transaction(async (tx) => {
    for (let i = 0; i < ids.length; i++) {
      await tx
        .update(pedidosAtmosfericos)
        .set({ orden: i })
        .where(
          and(
            byTenant(session.tenantId, pedidosAtmosfericos),
            eq(pedidosAtmosfericos.id, ids[i]!),
            eq(pedidosAtmosfericos.fechaProgramada, fecha),
          )
        );
    }
  });

  revalidatePath(RUTA);
}

/** Completar un pedido — registra litros, monto cobrado y actualiza estado */
export async function completarPedido(id: string, input: PedidoAtmosCompletarInput) {
  const session = await requireSession();

  const [pedido] = await db
    .select()
    .from(pedidosAtmosfericos)
    .where(and(byTenant(session.tenantId, pedidosAtmosfericos), eq(pedidosAtmosfericos.id, id)))
    .limit(1);

  if (!pedido) throw new Error('Pedido no encontrado');

  await db
    .update(pedidosAtmosfericos)
    .set({
      estado:          'completado',
      litrosPozo:      input.litrosPozo ?? pedido.litrosPozo,
      litrosExtraidos: input.litrosExtraidos ?? null,
      montoCobrado:    input.montoCobrado,
      metodoPago:      input.metodoPago ?? 'efectivo',
      notas:           input.notas ?? pedido.notas,
      completadoAt:    new Date(),
    })
    .where(and(byTenant(session.tenantId, pedidosAtmosfericos), eq(pedidosAtmosfericos.id, id)));

  // Guardar litros en el cliente si se pidió y hay cliente asociado
  if (input.guardarLitrosEnCliente && pedido.clienteId && input.litrosPozo) {
    await db
      .update(clientes)
      .set({ litrosPozoEstimado: input.litrosPozo })
      .where(and(byTenant(session.tenantId, clientes), eq(clientes.id, pedido.clienteId)));
  }

  revalidatePath(RUTA);
}

/** Cambiar estado a "en_camino" */
export async function marcarEnCamino(id: string) {
  const session = await requireSession();
  await db
    .update(pedidosAtmosfericos)
    .set({ estado: 'en_camino' })
    .where(and(byTenant(session.tenantId, pedidosAtmosfericos), eq(pedidosAtmosfericos.id, id)));
  revalidatePath(RUTA);
}

/** Cancelar un pedido */
export async function cancelarPedido(id: string) {
  const session = await requirePermiso('gestionar_atmosfericos');
  await db
    .update(pedidosAtmosfericos)
    .set({ estado: 'cancelado', activo: false })
    .where(and(byTenant(session.tenantId, pedidosAtmosfericos), eq(pedidosAtmosfericos.id, id)));
  revalidatePath(RUTA);
}

/** Historial de días anteriores agrupados por fecha */
export async function listarHistorial() {
  const session = await requireSession();
  const hoy = new Date().toISOString().slice(0, 10);

  const rows = await db
    .select({
      id:              pedidosAtmosfericos.id,
      nombreContacto:  pedidosAtmosfericos.nombreContacto,
      direccion:       pedidosAtmosfericos.direccion,
      localidad:       pedidosAtmosfericos.localidad,
      estado:          pedidosAtmosfericos.estado,
      fechaProgramada: pedidosAtmosfericos.fechaProgramada,
      litrosExtraidos: pedidosAtmosfericos.litrosExtraidos,
      montoCobrado:    pedidosAtmosfericos.montoCobrado,
      metodoPago:      pedidosAtmosfericos.metodoPago,
      notas:           pedidosAtmosfericos.notas,
      completadoAt:    pedidosAtmosfericos.completadoAt,
      clienteNombre:   clientes.razonSocial,
    })
    .from(pedidosAtmosfericos)
    .leftJoin(clientes, eq(pedidosAtmosfericos.clienteId, clientes.id))
    .where(
      and(
        byTenant(session.tenantId, pedidosAtmosfericos),
        lt(pedidosAtmosfericos.fechaProgramada, hoy),
        eq(pedidosAtmosfericos.activo, true),
      )
    )
    .orderBy(desc(pedidosAtmosfericos.fechaProgramada), asc(pedidosAtmosfericos.orden));

  // Agrupar por fecha en JS
  const porFecha = new Map<string, typeof rows>();
  for (const row of rows) {
    const f = row.fechaProgramada as unknown as string;
    if (!porFecha.has(f)) porFecha.set(f, []);
    porFecha.get(f)!.push(row);
  }

  return Array.from(porFecha.entries()).map(([fecha, pedidos]) => {
    const completados = pedidos.filter((p) => p.estado === 'completado');
    const totalCobrado = completados.reduce((s, p) => s + Number(p.montoCobrado ?? 0), 0);
    return { fecha, pedidos, totalCompletados: completados.length, totalCobrado };
  });
}

export type DiaHistorial = Awaited<ReturnType<typeof listarHistorial>>[number];

/** Guardar cliente desde un pedido ad-hoc */
export async function guardarClienteDesdePedido(
  pedidoId: string,
  nombreCliente: string,
) {
  const session = await requirePermiso('gestionar_atmosfericos');

  const [pedido] = await db
    .select()
    .from(pedidosAtmosfericos)
    .where(and(byTenant(session.tenantId, pedidosAtmosfericos), eq(pedidosAtmosfericos.id, pedidoId)))
    .limit(1);

  if (!pedido || pedido.clienteId) return; // ya tiene cliente

  const [nuevoCliente] = await db
    .insert(clientes)
    .values({
      tenantId:               session.tenantId,
      razonSocial:            nombreCliente,
      tipo:                   'minorista',
      condicionIva:           'consumidor_final',
      direccion:              pedido.direccion,
      localidad:              pedido.localidad ?? undefined,
      litrosPozoEstimado:     pedido.litrosPozo ?? undefined,
      habilitaCuentaCorriente: false,
      saldoActual:            '0',
    })
    .returning({ id: clientes.id });

  if (nuevoCliente) {
    await db
      .update(pedidosAtmosfericos)
      .set({ clienteId: nuevoCliente.id, nombreContacto: nombreCliente })
      .where(and(byTenant(session.tenantId, pedidosAtmosfericos), eq(pedidosAtmosfericos.id, pedidoId)));
  }

  revalidatePath(RUTA);
  revalidatePath('/dashboard/clientes');
}
