'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, ilike, asc } from 'drizzle-orm';
import { withTenant } from '@/server/db';
import { clientes, type TipoCliente, type CondicionIva } from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requirePermiso } from '@/server/auth/session';

export type ClienteInput = {
  tipo: TipoCliente;
  razonSocial: string;
  nombreFantasia?: string | null;
  cuit?: string | null;
  condicionIva: CondicionIva;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  habilitaCuentaCorriente: boolean;
  limiteCredito?: string | null;
  descuentoPorcentaje?: string | null;
  notas?: string | null;
  litrosPozoEstimado?: string | null;
};

export async function listarClientes(filtros?: { busqueda?: string; tipo?: TipoCliente }) {
  const session = await requirePermiso('gestionar_clientes');
  const conditions = [
    byTenant(session.tenantId, clientes),
    eq(clientes.activo, true),
  ];

  if (filtros?.tipo) conditions.push(eq(clientes.tipo, filtros.tipo));
  if (filtros?.busqueda) conditions.push(ilike(clientes.razonSocial, `%${filtros.busqueda}%`));

  return withTenant(session.tenantId, (db) =>
    db
      .select()
      .from(clientes)
      .where(and(...conditions))
      .orderBy(asc(clientes.razonSocial)),
  );
}

export async function obtenerCliente(id: string) {
  const session = await requirePermiso('gestionar_clientes');
  const [cliente] = await withTenant(session.tenantId, (db) =>
    db
      .select()
      .from(clientes)
      .where(and(byTenant(session.tenantId, clientes), eq(clientes.id, id)))
      .limit(1),
  );
  return cliente ?? null;
}

export async function crearCliente(input: ClienteInput) {
  const session = await requirePermiso('gestionar_clientes');
  const [creado] = await withTenant(session.tenantId, (db) =>
    db
    .insert(clientes)
    .values({
      tenantId: session.tenantId,
      tipo: input.tipo,
      razonSocial: input.razonSocial,
      nombreFantasia: input.nombreFantasia || null,
      cuit: input.cuit || null,
      condicionIva: input.condicionIva,
      email: input.email || null,
      telefono: input.telefono || null,
      direccion: input.direccion || null,
      localidad: input.localidad || null,
      habilitaCuentaCorriente: input.habilitaCuentaCorriente,
      limiteCredito: input.limiteCredito || null,
      descuentoPorcentaje: input.descuentoPorcentaje || null,
      notas: input.notas || null,
      litrosPozoEstimado: input.litrosPozoEstimado || null,
    })
    .returning({ id: clientes.id }),
  );

  revalidatePath('/dashboard/clientes');
  return creado;
}

export async function actualizarCliente(id: string, input: ClienteInput) {
  const session = await requirePermiso('gestionar_clientes');
  // No se puede modificar el Consumidor Final (enforzado en el WHERE).
  await withTenant(session.tenantId, (db) =>
    db
    .update(clientes)
    .set({
      tipo: input.tipo,
      razonSocial: input.razonSocial,
      nombreFantasia: input.nombreFantasia || null,
      cuit: input.cuit || null,
      condicionIva: input.condicionIva,
      email: input.email || null,
      telefono: input.telefono || null,
      direccion: input.direccion || null,
      localidad: input.localidad || null,
      habilitaCuentaCorriente: input.habilitaCuentaCorriente,
      limiteCredito: input.limiteCredito || null,
      descuentoPorcentaje: input.descuentoPorcentaje || null,
      notas: input.notas || null,
      litrosPozoEstimado: input.litrosPozoEstimado || null,
    })
    .where(and(
      byTenant(session.tenantId, clientes),
      eq(clientes.id, id),
      eq(clientes.esConsumidorFinal, false),
    )),
  );

  revalidatePath('/dashboard/clientes');
  revalidatePath(`/dashboard/clientes/${id}`);
}

export async function desactivarCliente(id: string) {
  const session = await requirePermiso('gestionar_clientes');
  await withTenant(session.tenantId, (db) =>
    db
      .update(clientes)
      .set({ activo: false })
      .where(and(
        byTenant(session.tenantId, clientes),
        eq(clientes.id, id),
        eq(clientes.esConsumidorFinal, false),
      )),
  );
  revalidatePath('/dashboard/clientes');
}
