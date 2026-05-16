'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, ilike, desc, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { productos, productoProveedores, proveedores, type TipoUnidad } from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requireSession } from '@/server/auth/session';
import type { VinculoProveedorInput } from './proveedores';

export type ProductoInput = {
  codigo?: string | null;
  nombre: string;
  descripcion?: string | null;
  categoriaId?: string | null;
  grupoVarianteId?: string | null;
  tipoUnidad: TipoUnidad;
  stockActual: string;
  stockMinimo?: string | null;
  costoPromedio: string;
  precioMayorista: string;
  precioMinorista: string;
  activo: boolean;
  vinculos?: VinculoProveedorInput[];
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
      categoriaId: input.categoriaId || null,
      grupoVarianteId: input.grupoVarianteId || null,
      tipoUnidad: input.tipoUnidad,
      stockActual: input.stockActual,
      stockMinimo: input.stockMinimo || null,
      costoPromedio: input.costoPromedio,
      precioMayorista: input.precioMayorista,
      precioMinorista: input.precioMinorista,
      activo: input.activo,
    })
    .returning({ id: productos.id });

  if (creado && input.vinculos && input.vinculos.length > 0) {
    await db.insert(productoProveedores).values(
      input.vinculos.map((v) => ({
        tenantId: session.tenantId,
        productoId: creado.id,
        proveedorId: v.proveedorId,
        precioCosto: v.precioCosto,
        markupMayorista: v.markupMayorista || null,
        markupMinorista: v.markupMinorista || null,
        esPrincipal: v.esPrincipal,
      })),
    );
  }

  revalidatePath('/dashboard/productos');
  return creado;
}

export async function actualizarProducto(id: string, input: ProductoInput) {
  const session = await requireSession();

  await db.transaction(async (tx) => {
    await tx
      .update(productos)
      .set({
        codigo: input.codigo || null,
        nombre: input.nombre,
        descripcion: input.descripcion || null,
        categoriaId: input.categoriaId || null,
        grupoVarianteId: input.grupoVarianteId || null,
        tipoUnidad: input.tipoUnidad,
        stockActual: input.stockActual,
        stockMinimo: input.stockMinimo || null,
        costoPromedio: input.costoPromedio,
        precioMayorista: input.precioMayorista,
        precioMinorista: input.precioMinorista,
        activo: input.activo,
      })
      .where(and(byTenant(session.tenantId, productos), eq(productos.id, id)));

    if (input.vinculos !== undefined) {
      await tx
        .delete(productoProveedores)
        .where(
          and(
            byTenant(session.tenantId, productoProveedores),
            eq(productoProveedores.productoId, id),
          ),
        );

      if (input.vinculos.length > 0) {
        await tx.insert(productoProveedores).values(
          input.vinculos.map((v) => ({
            tenantId: session.tenantId,
            productoId: id,
            proveedorId: v.proveedorId,
            precioCosto: v.precioCosto,
            markupMayorista: v.markupMayorista || null,
            markupMinorista: v.markupMinorista || null,
            esPrincipal: v.esPrincipal,
          })),
        );
      }
    }
  });

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

export async function toggleActivoProducto(id: string) {
  const session = await requireSession();
  const [prod] = await db
    .select({ activo: productos.activo })
    .from(productos)
    .where(and(byTenant(session.tenantId, productos), eq(productos.id, id)))
    .limit(1);
  if (!prod) throw new Error('Producto no encontrado');

  await db
    .update(productos)
    .set({ activo: !prod.activo })
    .where(and(byTenant(session.tenantId, productos), eq(productos.id, id)));
  revalidatePath('/dashboard/productos');
  revalidatePath(`/dashboard/productos/${id}`);
}

export async function fijarStock(input: { productoId: string; nuevoStock: string }) {
  const session = await requireSession();
  const valor = Number(input.nuevoStock);
  if (isNaN(valor) || valor < 0) throw new Error('Valor de stock inválido');

  await db
    .update(productos)
    .set({ stockActual: valor.toFixed(3) })
    .where(and(byTenant(session.tenantId, productos), eq(productos.id, input.productoId)));

  revalidatePath('/dashboard/productos');
  revalidatePath(`/dashboard/productos/${input.productoId}`);
  revalidatePath('/dashboard');
}

export type TipoAjuste = 'entrada' | 'salida';

export async function ajustarStock(input: {
  productoId: string;
  tipo: TipoAjuste;
  cantidad: string;
}) {
  const session = await requireSession();
  const cantidad = Number(input.cantidad);
  if (isNaN(cantidad) || cantidad <= 0) throw new Error('Cantidad inválida');

  await db.transaction(async (tx) => {
    const result = await tx
      .select({ stock: productos.stockActual })
      .from(productos)
      .where(and(byTenant(session.tenantId, productos), eq(productos.id, input.productoId)))
      .limit(1);

    const producto = result[0];
    if (!producto) throw new Error('Producto no encontrado');

    const stockActual = Number(producto.stock);
    const nuevoStock = input.tipo === 'entrada'
      ? stockActual + cantidad
      : stockActual - cantidad;

    if (nuevoStock < 0) throw new Error('El stock no puede quedar negativo');

    await tx
      .update(productos)
      .set({ stockActual: nuevoStock.toFixed(3) })
      .where(and(byTenant(session.tenantId, productos), eq(productos.id, input.productoId)));
  });

  revalidatePath('/dashboard/productos');
  revalidatePath(`/dashboard/productos/${input.productoId}`);
  revalidatePath('/dashboard');
}
