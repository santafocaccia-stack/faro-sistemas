'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, ilike, desc } from 'drizzle-orm';
import { db } from '@/server/db';
import { productos, type TipoUnidad } from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requireSession } from '@/server/auth/session';

export type ProductoInput = {
  codigo?: string | null;
  nombre: string;
  descripcion?: string | null;
  categoria?: string | null;
  tipoUnidad: TipoUnidad;
  stockActual: string;
  stockMinimo?: string | null;
  costoPromedio: string;
  precioMayorista: string;
  precioMinorista: string;
  activo: boolean;
};

export async function listarProductos(filtros?: { busqueda?: string; soloActivos?: boolean }) {
  const session = await requireSession();
  const conditions = [byTenant(session.tenantId, productos)];

  if (filtros?.soloActivos) {
    conditions.push(eq(productos.activo, true));
  }
  if (filtros?.busqueda) {
    conditions.push(ilike(productos.nombre, `%${filtros.busqueda}%`));
  }

  return db
    .select()
    .from(productos)
    .where(and(...conditions))
    .orderBy(desc(productos.createdAt));
}

export async function obtenerProducto(id: string) {
  const session = await requireSession();
  const [producto] = await db
    .select()
    .from(productos)
    .where(and(byTenant(session.tenantId, productos), eq(productos.id, id)))
    .limit(1);
  return producto ?? null;
}

export async function crearProducto(input: ProductoInput) {
  const session = await requireSession();
  const [creado] = await db
    .insert(productos)
    .values({
      tenantId: session.tenantId,
      codigo: input.codigo || null,
      nombre: input.nombre,
      descripcion: input.descripcion || null,
      categoria: input.categoria || null,
      tipoUnidad: input.tipoUnidad,
      stockActual: input.stockActual,
      stockMinimo: input.stockMinimo || null,
      costoPromedio: input.costoPromedio,
      precioMayorista: input.precioMayorista,
      precioMinorista: input.precioMinorista,
      activo: input.activo,
    })
    .returning({ id: productos.id });

  revalidatePath('/dashboard/productos');
  return creado;
}

export async function actualizarProducto(id: string, input: ProductoInput) {
  const session = await requireSession();
  await db
    .update(productos)
    .set({
      codigo: input.codigo || null,
      nombre: input.nombre,
      descripcion: input.descripcion || null,
      categoria: input.categoria || null,
      tipoUnidad: input.tipoUnidad,
      stockActual: input.stockActual,
      stockMinimo: input.stockMinimo || null,
      costoPromedio: input.costoPromedio,
      precioMayorista: input.precioMayorista,
      precioMinorista: input.precioMinorista,
      activo: input.activo,
    })
    .where(and(byTenant(session.tenantId, productos), eq(productos.id, id)));

  revalidatePath('/dashboard/productos');
  revalidatePath(`/dashboard/productos/${id}`);
}

export async function desactivarProducto(id: string) {
  const session = await requireSession();
  await db
    .update(productos)
    .set({ activo: false })
    .where(and(byTenant(session.tenantId, productos), eq(productos.id, id)));
  revalidatePath('/dashboard/productos');
}
