'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, ilike, desc, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { productos, productoProveedores, proveedores, type TipoUnidad } from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requireSession } from '@/server/auth/session';
import {
  productoInputSchema,
  ajustarStockSchema,
  fijarStockSchema,
  formatZodError,
} from '@/server/schemas';
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
  const parsed = productoInputSchema.safeParse(input);
  if (!parsed.success) throw new Error(formatZodError(parsed.error));
  const data = parsed.data;

  const [creado] = await db
    .insert(productos)
    .values({
      tenantId: session.tenantId,
      codigo: data.codigo || null,
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      categoriaId: data.categoriaId || null,
      grupoVarianteId: data.grupoVarianteId || null,
      tipoUnidad: data.tipoUnidad,
      stockActual: data.stockActual,
      stockMinimo: data.stockMinimo || null,
      costoPromedio: data.costoPromedio,
      precioMayorista: data.precioMayorista,
      precioMinorista: data.precioMinorista,
      activo: data.activo,
    })
    .returning({ id: productos.id });

  if (creado && data.vinculos && data.vinculos.length > 0) {
    await db.insert(productoProveedores).values(
      data.vinculos.map((v) => ({
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
  const parsed = productoInputSchema.safeParse(input);
  if (!parsed.success) throw new Error(formatZodError(parsed.error));
  const data = parsed.data;

  await db.transaction(async (tx) => {
    await tx
      .update(productos)
      .set({
        codigo: data.codigo || null,
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        categoriaId: data.categoriaId || null,
        grupoVarianteId: data.grupoVarianteId || null,
        tipoUnidad: data.tipoUnidad,
        stockActual: data.stockActual,
        stockMinimo: data.stockMinimo || null,
        costoPromedio: data.costoPromedio,
        precioMayorista: data.precioMayorista,
        precioMinorista: data.precioMinorista,
        activo: data.activo,
      })
      .where(and(byTenant(session.tenantId, productos), eq(productos.id, id)));

    if (data.vinculos !== undefined) {
      await tx
        .delete(productoProveedores)
        .where(
          and(
            byTenant(session.tenantId, productoProveedores),
            eq(productoProveedores.productoId, id),
          ),
        );

      if (data.vinculos.length > 0) {
        await tx.insert(productoProveedores).values(
          data.vinculos.map((v) => ({
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
  const parsed = fijarStockSchema.safeParse(input);
  if (!parsed.success) throw new Error(formatZodError(parsed.error));
  const { productoId, nuevoStock } = parsed.data;
  const valor = Number(nuevoStock);

  await db
    .update(productos)
    .set({ stockActual: valor.toFixed(3) })
    .where(and(byTenant(session.tenantId, productos), eq(productos.id, productoId)));

  revalidatePath('/dashboard/productos');
  revalidatePath(`/dashboard/productos/${productoId}`);
  revalidatePath('/dashboard');
}

export type TipoAjuste = 'entrada' | 'salida';

export async function ajustarStock(input: {
  productoId: string;
  tipo: TipoAjuste;
  cantidad: string;
}) {
  const session = await requireSession();
  const parsed = ajustarStockSchema.safeParse(input);
  if (!parsed.success) throw new Error(formatZodError(parsed.error));
  const { productoId, tipo, cantidad: cantidadStr } = parsed.data;
  const cantidad = Number(cantidadStr);

  await db.transaction(async (tx) => {
    const result = await tx
      .select({ stock: productos.stockActual })
      .from(productos)
      .where(and(byTenant(session.tenantId, productos), eq(productos.id, productoId)))
      .limit(1);

    const producto = result[0];
    if (!producto) throw new Error('Producto no encontrado');

    const stockActual = Number(producto.stock);
    const nuevoStock = tipo === 'entrada'
      ? stockActual + cantidad
      : stockActual - cantidad;

    if (nuevoStock < 0) throw new Error('El stock no puede quedar negativo');

    await tx
      .update(productos)
      .set({ stockActual: nuevoStock.toFixed(3) })
      .where(and(byTenant(session.tenantId, productos), eq(productos.id, productoId)));
  });

  revalidatePath('/dashboard/productos');
  revalidatePath(`/dashboard/productos/${input.productoId}`);
  revalidatePath('/dashboard');
}
