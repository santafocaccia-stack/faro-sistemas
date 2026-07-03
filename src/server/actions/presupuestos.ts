'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { withTenant } from '@/server/db';
import {
  presupuestos, presupuestosLineas, clientes,
  type PresupuestoEstado, type MetodoPago,
} from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requirePermiso } from '@/server/auth/session';

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

/** Boleta = comprobante de cobro (no fiscal). Nace ya cobrada. */
export type BoletaInput = {
  clienteId?: string | null;
  clienteNombre?: string | null;
  notas?: string | null;
  descuento: string;
  metodoPago: MetodoPago;
  lineas: LineaPresupuesto[];
};

// ── Descripciones usadas (autocompletado) ──────────────────────────────────────

/**
 * Devuelve las descripciones de líneas que el negocio ya usó antes, ordenadas
 * por frecuencia. Sirven como sugerencias editables al armar un presupuesto
 * (ej: "Recorte de cerco", "Losa radiante").
 */
export async function listarDescripcionesUsadas(): Promise<string[]> {
  const session = await requirePermiso('gestionar_presupuestos');
  const rows = await withTenant(session.tenantId, (db) =>
    db
    .select({ descripcion: presupuestosLineas.descripcion })
    .from(presupuestosLineas)
    .innerJoin(
      presupuestos,
      and(eq(presupuestosLineas.presupuestoId, presupuestos.id), byTenant(session.tenantId, presupuestos)),
    )
    .groupBy(presupuestosLineas.descripcion)
    .orderBy(sql`count(*) desc`)
    .limit(60),
  );
  return rows
    .map((r) => r.descripcion?.trim())
    .filter((d): d is string => !!d && d.length > 1);
}

// ── Listar ────────────────────────────────────────────────────────────────────

export async function listarPresupuestos() {
  const session = await requirePermiso('gestionar_presupuestos');
  const { tenantId } = session;

  const rows = await withTenant(tenantId, (db) =>
    db
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
      .where(and(byTenant(tenantId, presupuestos), eq(presupuestos.tipo, 'presupuesto')))
      .orderBy(desc(presupuestos.createdAt)),
  );

  return rows.map((r) => ({
    ...r,
    clienteDisplay: r.clienteRazon ?? r.clienteNombre ?? 'Sin cliente',
    total: Number(r.total),
  }));
}

// ── Listar boletas (comprobantes de cobro) ─────────────────────────────────────

export async function listarBoletas() {
  const session = await requirePermiso('gestionar_presupuestos');
  const { tenantId } = session;

  const rows = await withTenant(tenantId, (db) =>
    db
      .select({
        id:            presupuestos.id,
        numero:        presupuestos.numero,
        clienteNombre: presupuestos.clienteNombre,
        clienteRazon:  clientes.razonSocial,
        cobradoAt:     presupuestos.cobradoAt,
        metodoCobro:   presupuestos.metodoCobro,
        total:         presupuestos.total,
      })
      .from(presupuestos)
      .leftJoin(clientes, eq(presupuestos.clienteId, clientes.id))
      .where(and(byTenant(tenantId, presupuestos), eq(presupuestos.tipo, 'boleta')))
      .orderBy(desc(presupuestos.createdAt)),
  );

  return rows.map((r) => ({
    ...r,
    clienteDisplay: r.clienteRazon ?? r.clienteNombre ?? 'Sin cliente',
    total: Number(r.total),
  }));
}

// ── Obtener uno ───────────────────────────────────────────────────────────────

export async function obtenerPresupuesto(id: string) {
  const session = await requirePermiso('gestionar_presupuestos');
  const { tenantId } = session;

  return withTenant(tenantId, async (db) => {
  const [pres] = await db
    .select()
    .from(presupuestos)
    .where(and(byTenant(tenantId, presupuestos), eq(presupuestos.id, id)))
    .limit(1);

  if (!pres) return null;

  // Líneas: inner join con el presupuesto ya validado para garantizar tenant
  const lineasRows = await db
    .select({ l: presupuestosLineas })
    .from(presupuestosLineas)
    .innerJoin(
      presupuestos,
      and(eq(presupuestosLineas.presupuestoId, presupuestos.id), byTenant(tenantId, presupuestos))
    )
    .where(eq(presupuestosLineas.presupuestoId, id));
  const lineas = lineasRows.map((r) => r.l);

  // Nombre del cliente — filtrar también por tenant para no cruzar datos
  let clienteDisplay = pres.clienteNombre ?? 'Sin cliente';
  if (pres.clienteId) {
    const [c] = await db
      .select({ razonSocial: clientes.razonSocial })
      .from(clientes)
      .where(and(byTenant(tenantId, clientes), eq(clientes.id, pres.clienteId)))
      .limit(1);
    if (c) clienteDisplay = c.razonSocial;
  }

  return { pres, lineas, clienteDisplay };
  });
}

// ── Crear ─────────────────────────────────────────────────────────────────────

export async function crearPresupuesto(input: PresupuestoInput) {
  const session = await requirePermiso('gestionar_presupuestos');
  const { tenantId } = session;

  // Calcular subtotal y total
  const subtotal = input.lineas.reduce((acc, l) => acc + Number(l.subtotal), 0);
  const descuento = Number(input.descuento ?? 0);
  const total = subtotal - descuento;

  // Número correlativo por tenant — envuelto en transacción para evitar race condition
  const creado = await withTenant(tenantId, async (tx) => {
    const result = await tx
      .select({ maxNum: sql<number>`coalesce(max(${presupuestos.numero}), 0)::int` })
      .from(presupuestos)
      .where(and(byTenant(tenantId, presupuestos), eq(presupuestos.tipo, 'presupuesto')));

    const numero = (result[0]?.maxNum ?? 0) + 1;

    const [inserted] = await tx
      .insert(presupuestos)
      .values({
        tenantId,
        numero,
        clienteId:     input.clienteId    || null,
        clienteNombre: input.clienteNombre || null,
        validezDias:   input.validezDias,
        notas:         input.notas || null,
        subtotal:      subtotal.toFixed(2),
        descuento:     descuento.toFixed(2),
        total:         total.toFixed(2),
      })
      .returning({ id: presupuestos.id });

    if (!inserted) throw new Error('Error al crear presupuesto');

    if (input.lineas.length > 0) {
      await tx.insert(presupuestosLineas).values(
        input.lineas.map((l) => ({
          presupuestoId:  inserted.id,
          productoId:     l.productoId || null,
          descripcion:    l.descripcion,
          cantidad:       l.cantidad,
          precioUnitario: l.precioUnitario,
          subtotal:       l.subtotal,
        })),
      );
    }

    return inserted;
  });

  revalidatePath('/dashboard/presupuestos');
  return creado;
}

// ── Crear boleta (comprobante de cobro no fiscal) ──────────────────────────────

export async function crearBoleta(input: BoletaInput) {
  const session = await requirePermiso('gestionar_presupuestos');
  const { tenantId } = session;

  const subtotal = input.lineas.reduce((acc, l) => acc + Number(l.subtotal), 0);
  const descuento = Number(input.descuento ?? 0);
  const total = subtotal - descuento;

  const creado = await withTenant(tenantId, async (tx) => {
    // Numeración propia de boletas (independiente de los presupuestos)
    const result = await tx
      .select({ maxNum: sql<number>`coalesce(max(${presupuestos.numero}), 0)::int` })
      .from(presupuestos)
      .where(and(byTenant(tenantId, presupuestos), eq(presupuestos.tipo, 'boleta')));

    const numero = (result[0]?.maxNum ?? 0) + 1;

    const [inserted] = await tx
      .insert(presupuestos)
      .values({
        tenantId,
        numero,
        tipo:          'boleta',
        clienteId:     input.clienteId    || null,
        clienteNombre: input.clienteNombre || null,
        validezDias:   0,
        estado:        'cobrado',
        cobradoAt:     new Date(),
        metodoCobro:   input.metodoPago,
        notas:         input.notas || null,
        subtotal:      subtotal.toFixed(2),
        descuento:     descuento.toFixed(2),
        total:         total.toFixed(2),
      })
      .returning({ id: presupuestos.id });

    if (!inserted) throw new Error('Error al crear la boleta');

    if (input.lineas.length > 0) {
      await tx.insert(presupuestosLineas).values(
        input.lineas.map((l) => ({
          presupuestoId:  inserted.id,
          productoId:     l.productoId || null,
          descripcion:    l.descripcion,
          cantidad:       l.cantidad,
          precioUnitario: l.precioUnitario,
          subtotal:       l.subtotal,
        })),
      );
    }

    return inserted;
  });

  revalidatePath('/dashboard/boletas');
  revalidatePath('/dashboard');
  return creado;
}

// ── Editar ────────────────────────────────────────────────────────────────────

export async function editarPresupuesto(id: string, input: PresupuestoInput) {
  const session = await requirePermiso('gestionar_presupuestos');
  const { tenantId } = session;

  const subtotal  = input.lineas.reduce((acc, l) => acc + Number(l.subtotal), 0);
  const descuento = Number(input.descuento ?? 0);
  const total     = subtotal - descuento;

  await withTenant(tenantId, async (tx) => {
    // Verificar que pertenece al tenant
    const check = await tx
      .select({ id: presupuestos.id })
      .from(presupuestos)
      .where(and(byTenant(tenantId, presupuestos), eq(presupuestos.id, id)))
      .limit(1);

    if (!check[0]) throw new Error('Presupuesto no encontrado');

    // Actualizar cabecera
    await tx
      .update(presupuestos)
      .set({
        clienteId:     input.clienteId    || null,
        clienteNombre: input.clienteNombre || null,
        validezDias:   input.validezDias,
        notas:         input.notas || null,
        subtotal:      subtotal.toFixed(2),
        descuento:     descuento.toFixed(2),
        total:         total.toFixed(2),
      })
      .where(and(byTenant(tenantId, presupuestos), eq(presupuestos.id, id)));

    // Reemplazar líneas
    await tx.delete(presupuestosLineas).where(eq(presupuestosLineas.presupuestoId, id));

    if (input.lineas.length > 0) {
      await tx.insert(presupuestosLineas).values(
        input.lineas.map((l) => ({
          presupuestoId:  id,
          productoId:     l.productoId || null,
          descripcion:    l.descripcion,
          cantidad:       l.cantidad,
          precioUnitario: l.precioUnitario,
          subtotal:       l.subtotal,
        })),
      );
    }
  });

  revalidatePath('/dashboard/presupuestos');
  revalidatePath(`/dashboard/presupuestos/${id}`);
  return { id };
}

// ── Cambiar estado ────────────────────────────────────────────────────────────

export async function cambiarEstadoPresupuesto(id: string, estado: PresupuestoEstado) {
  const session = await requirePermiso('gestionar_presupuestos');
  const result = await withTenant(session.tenantId, (db) =>
    db
      .update(presupuestos)
      .set({ estado })
      .where(and(byTenant(session.tenantId, presupuestos), eq(presupuestos.id, id)))
      .returning({ id: presupuestos.id }),
  );
  if (result.length === 0) throw new Error('Presupuesto no encontrado');
  revalidatePath('/dashboard/presupuestos');
  revalidatePath(`/dashboard/presupuestos/${id}`);
}

// ── Cobrar (plan servicios) ─────────────────────────────────────────────────────

/**
 * Marca un presupuesto como cobrado: registra el ingreso (fecha + método).
 * Es el flujo de cobro del plan Servicios — reemplaza al POS.
 */
export async function marcarCobrado(
  id: string,
  metodo: MetodoPago,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requirePermiso('gestionar_presupuestos');
  const result = await withTenant(session.tenantId, (db) =>
    db
      .update(presupuestos)
      .set({ estado: 'cobrado', cobradoAt: new Date(), metodoCobro: metodo })
      .where(and(byTenant(session.tenantId, presupuestos), eq(presupuestos.id, id)))
      .returning({ id: presupuestos.id }),
  );
  if (result.length === 0) return { ok: false, error: 'Presupuesto no encontrado' };
  revalidatePath('/dashboard/presupuestos');
  revalidatePath(`/dashboard/presupuestos/${id}`);
  revalidatePath('/dashboard');
  return { ok: true };
}

/** Revierte un cobro: vuelve el presupuesto a 'aprobado' y limpia el cobro. */
export async function revertirCobro(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requirePermiso('gestionar_presupuestos');
  const result = await withTenant(session.tenantId, (db) =>
    db
      .update(presupuestos)
      .set({ estado: 'aprobado', cobradoAt: null, metodoCobro: null })
      .where(and(byTenant(session.tenantId, presupuestos), eq(presupuestos.id, id)))
      .returning({ id: presupuestos.id }),
  );
  if (result.length === 0) return { ok: false, error: 'Presupuesto no encontrado' };
  revalidatePath('/dashboard/presupuestos');
  revalidatePath(`/dashboard/presupuestos/${id}`);
  revalidatePath('/dashboard');
  return { ok: true };
}

/**
 * Resumen para el inicio del plan Servicios:
 * cobrado del mes, pendientes de cobro (aprobados), presupuestos abiertos.
 */
export async function resumenServicios() {
  const session = await requirePermiso('gestionar_presupuestos');
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  // Promise.all dentro de la tx: postgres-js pipelinea (sin perder paralelismo).
  const [[cobrado], [porCobrar], [abiertos]] = await withTenant(session.tenantId, (db) =>
    Promise.all([
      db
        .select({
          total: sql<string>`coalesce(sum(${presupuestos.total}), 0)`,
          cantidad: sql<number>`count(*)::int`,
        })
        .from(presupuestos)
        .where(and(
          byTenant(session.tenantId, presupuestos),
          eq(presupuestos.estado, 'cobrado'),
          gte(presupuestos.cobradoAt, inicioMes),
        )),
      db
        .select({
          total: sql<string>`coalesce(sum(${presupuestos.total}), 0)`,
          cantidad: sql<number>`count(*)::int`,
        })
        .from(presupuestos)
        .where(and(
          byTenant(session.tenantId, presupuestos),
          eq(presupuestos.estado, 'aprobado'),
        )),
      db
        .select({ cantidad: sql<number>`count(*)::int` })
        .from(presupuestos)
        .where(and(
          byTenant(session.tenantId, presupuestos),
          eq(presupuestos.esPlantilla, false),
          sql`${presupuestos.estado} in ('borrador','enviado')`,
        )),
    ]),
  );

  return {
    cobradoMes: cobrado?.total ?? '0',
    cobradoMesCant: cobrado?.cantidad ?? 0,
    porCobrar: porCobrar?.total ?? '0',
    porCobrarCant: porCobrar?.cantidad ?? 0,
    abiertos: abiertos?.cantidad ?? 0,
  };
}

// ── Eliminar ──────────────────────────────────────────────────────────────────

export async function eliminarPresupuesto(id: string) {
  const session = await requirePermiso('gestionar_presupuestos');
  const result = await withTenant(session.tenantId, (db) =>
    db
      .delete(presupuestos)
      .where(and(byTenant(session.tenantId, presupuestos), eq(presupuestos.id, id)))
      .returning({ id: presupuestos.id }),
  );
  if (result.length === 0) throw new Error('Presupuesto no encontrado');
  revalidatePath('/dashboard/presupuestos');
}

// ── Plantillas ────────────────────────────────────────────────────────────────

/**
 * Guarda un presupuesto existente como plantilla reutilizable.
 * Las plantillas no se muestran en la lista principal pero se pueden duplicar.
 */
export async function guardarComoPlantilla(
  id: string,
  nombrePlantilla: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!nombrePlantilla.trim()) return { ok: false, error: 'El nombre de la plantilla es requerido' };

  const session = await requirePermiso('gestionar_presupuestos');
  const result = await withTenant(session.tenantId, (db) =>
    db
      .update(presupuestos)
      .set({ esPlantilla: true, nombrePlantilla: nombrePlantilla.trim() })
      .where(and(byTenant(session.tenantId, presupuestos), eq(presupuestos.id, id)))
      .returning({ id: presupuestos.id }),
  );

  if (result.length === 0) return { ok: false, error: 'Presupuesto no encontrado' };
  revalidatePath('/dashboard/presupuestos');
  revalidatePath(`/dashboard/presupuestos/${id}`);
  return { ok: true };
}

/**
 * Lista todas las plantillas del tenant.
 */
export async function listarPlantillas() {
  const session = await requirePermiso('gestionar_presupuestos');
  const rows = await withTenant(session.tenantId, (db) =>
    db
      .select({
        id:              presupuestos.id,
        nombrePlantilla: presupuestos.nombrePlantilla,
        total:           presupuestos.total,
        notas:           presupuestos.notas,
      })
      .from(presupuestos)
      .where(and(byTenant(session.tenantId, presupuestos), eq(presupuestos.esPlantilla, true)))
      .orderBy(desc(presupuestos.createdAt)),
  );

  return rows.map((r) => ({ ...r, total: Number(r.total) }));
}

/**
 * Duplica una plantilla como un nuevo presupuesto borrador.
 * Copiamos todas las líneas; el cliente queda vacío para que el usuario lo complete.
 */
export async function usarPlantilla(
  plantillaId: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const session = await requirePermiso('gestionar_presupuestos');
  const { tenantId } = session;

  const datos = await obtenerPresupuesto(plantillaId);
  if (!datos) return { ok: false, error: 'Plantilla no encontrada' };

  try {
    const creado = await withTenant(tenantId, async (tx) => {
      const result = await tx
        .select({ maxNum: sql<number>`coalesce(max(${presupuestos.numero}), 0)::int` })
        .from(presupuestos)
        .where(byTenant(tenantId, presupuestos));

      const numero = (result[0]?.maxNum ?? 0) + 1;

      const [inserted] = await tx
        .insert(presupuestos)
        .values({
          tenantId,
          numero,
          clienteId:     null,
          clienteNombre: null,
          validezDias:   datos.pres.validezDias,
          notas:         datos.pres.notas || null,
          subtotal:      datos.pres.subtotal,
          descuento:     datos.pres.descuento,
          total:         datos.pres.total,
          esPlantilla:   false,
        })
        .returning({ id: presupuestos.id });

      if (!inserted) throw new Error('No se pudo crear el presupuesto');

      if (datos.lineas.length > 0) {
        await tx.insert(presupuestosLineas).values(
          datos.lineas.map((l) => ({
            presupuestoId:  inserted.id,
            productoId:     l.productoId || null,
            descripcion:    l.descripcion,
            cantidad:       l.cantidad,
            precioUnitario: l.precioUnitario,
            subtotal:       l.subtotal,
          })),
        );
      }

      return inserted;
    });

    revalidatePath('/dashboard/presupuestos');
    return { ok: true, id: creado.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
