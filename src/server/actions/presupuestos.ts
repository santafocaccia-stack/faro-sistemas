'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { presupuestos, presupuestosLineas, clientes, type PresupuestoEstado } from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requireSession } from '@/server/auth/session';

export type LineaPresupuesto = {
  productoId?: string | null;
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
  subtotal: string;
};

export type PresupuestoInput = {
  clienteId?: string | null;
  clienteNombre?: string | null;
  validezDias: number;
  notas?: string | null;
  descuento: string;
  lineas: LineaPresupuesto[];
};

// ── Listar ────────────────────────────────────────────────────────────────────

export async function listarPresupuestos() {
  const session = await requireSession();
  const { tenantId } = session;

  const rows = await db
    .select({
      id:            presupuestos.id,
      numero:        presupuestos.numero,
      clienteNombre: presupuestos.clienteNombre,
      clienteRazon:  clientes.razonSocial,
      fecha:         presupuestos.fecha,
      validezDias:   presupuestos.validezDias,
      estado:        presupuestos.estado,
      total:         presupuestos.total,
    })
    .from(presupuestos)
    .leftJoin(clientes, eq(presupuestos.clienteId, clientes.id))
    .where(byTenant(tenantId, presupuestos))
    .orderBy(desc(presupuestos.createdAt));

  return rows.map((r) => ({
    ...r,
    clienteDisplay: r.clienteRazon ?? r.clienteNombre ?? 'Sin cliente',
    total: Number(r.total),
  }));
}

// ── Obtener uno ───────────────────────────────────────────────────────────────

export async function obtenerPresupuesto(id: string) {
  const session = await requireSession();
  const { tenantId } = session;

  const [pres] = await db
    .select()
    .from(presupuestos)
    .where(and(byTenant(tenantId, presupuestos), eq(presupuestos.id, id)))
    .limit(1);

  if (!pres) return null;

  const lineas = await db
    .select()
    .from(presupuestosLineas)
    .where(eq(presupuestosLineas.presupuestoId, id));

  // Nombre del cliente
  let clienteDisplay = pres.clienteNombre ?? 'Sin cliente';
  if (pres.clienteId) {
    const [c] = await db
      .select({ razonSocial: clientes.razonSocial })
      .from(clientes)
      .where(eq(clientes.id, pres.clienteId))
      .limit(1);
    if (c) clienteDisplay = c.razonSocial;
  }

  return { pres, lineas, clienteDisplay };
}

// ── Crear ─────────────────────────────────────────────────────────────────────

export async function crearPresupuesto(input: PresupuestoInput) {
  const session = await requireSession();
  const { tenantId } = session;

  // Calcular subtotal y total
  const subtotal = input.lineas.reduce((acc, l) => acc + Number(l.subtotal), 0);
  const descuento = Number(input.descuento ?? 0);
  const total = subtotal - descuento;

  // Número correlativo por tenant
  const [{ maxNum }] = await db
    .select({ maxNum: sql<number>`coalesce(max(${presupuestos.numero}), 0)::int` })
    .from(presupuestos)
    .where(byTenant(tenantId, presupuestos));

  const numero = (maxNum ?? 0) + 1;

  const [creado] = await db
    .insert(presupuestos)
    .values({
      tenantId,
      numero,
      clienteId:    input.clienteId   || null,
      clienteNombre: input.clienteNombre || null,
      validezDias:  input.validezDias,
      notas:        input.notas || null,
      subtotal:     subtotal.toFixed(2),
      descuento:    descuento.toFixed(2),
      total:        total.toFixed(2),
    })
    .returning({ id: presupuestos.id });

  if (!creado) throw new Error('Error al crear presupuesto');

  if (input.lineas.length > 0) {
    await db.insert(presupuestosLineas).values(
      input.lineas.map((l) => ({
        presupuestoId:  creado.id,
        productoId:     l.productoId || null,
        descripcion:    l.descripcion,
        cantidad:       l.cantidad,
        precioUnitario: l.precioUnitario,
        subtotal:       l.subtotal,
      })),
    );
  }

  revalidatePath('/dashboard/presupuestos');
  return creado;
}

// ── Cambiar estado ────────────────────────────────────────────────────────────

export async function cambiarEstadoPresupuesto(id: string, estado: PresupuestoEstado) {
  const session = await requireSession();
  await db
    .update(presupuestos)
    .set({ estado })
    .where(and(byTenant(session.tenantId, presupuestos), eq(presupuestos.id, id)));
  revalidatePath('/dashboard/presupuestos');
  revalidatePath(`/dashboard/presupuestos/${id}`);
}

// ── Eliminar ──────────────────────────────────────────────────────────────────

export async function eliminarPresupuesto(id: string) {
  const session = await requireSession();
  await db
    .delete(presupuestos)
    .where(and(byTenant(session.tenantId, presupuestos), eq(presupuestos.id, id)));
  revalidatePath('/dashboard/presupuestos');
}
