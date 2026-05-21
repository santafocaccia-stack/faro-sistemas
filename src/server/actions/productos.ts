'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, ilike, desc, sql, asc } from 'drizzle-orm';
import { db } from '@/server/db';
import { productos, productoProveedores, proveedores, categorias, type TipoUnidad } from '@/server/db/schema';
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

export type CrearProductoResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function crearProducto(input: ProductoInput): Promise<CrearProductoResult> {
  const session = await requireSession();
  const parsed = productoInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: formatZodError(parsed.error) };
  }
  const data = parsed.data;

  let creado: { id: string } | undefined;
  try {
    [creado] = await db
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
  } catch (err) {
    console.error('[crearProducto] Error insertando producto:', err);
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `BD: ${msg}` };
  }

  if (!creado) {
    return { ok: false, error: 'No se devolvió ID del producto creado' };
  }

  if (data.vinculos && data.vinculos.length > 0) {
    try {
      await db.insert(productoProveedores).values(
        data.vinculos.map((v) => ({
          tenantId: session.tenantId,
          productoId: creado!.id,
          proveedorId: v.proveedorId,
          precioCosto: v.precioCosto,
          markupMayorista: v.markupMayorista || null,
          markupMinorista: v.markupMinorista || null,
          esPrincipal: v.esPrincipal,
        })),
      );
    } catch (err) {
      console.error('[crearProducto] Error insertando vinculos:', err);
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `Vínculos proveedores: ${msg}` };
    }
  }

  revalidatePath('/dashboard/productos');
  return { ok: true, id: creado.id };
}

export type ActualizarProductoResult =
  | { ok: true }
  | { ok: false; error: string };

export async function actualizarProducto(
  id: string,
  input: ProductoInput,
): Promise<ActualizarProductoResult> {
  const session = await requireSession();
  const parsed = productoInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: formatZodError(parsed.error) };
  }
  const data = parsed.data;

  try {
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
  } catch (err) {
    console.error('[actualizarProducto] Error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `BD: ${msg}` };
  }

  revalidatePath('/dashboard/productos');
  revalidatePath(`/dashboard/productos/${id}`);
  return { ok: true };
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

// ── Importación masiva CSV ────────────────────────────────────────────────────

export type CsvFila = {
  nombre: string;
  precioMinorista: string;
  precioMayorista?: string;
  codigo?: string;
  categoriaNombre?: string;
};

export type ImportarCsvResult = {
  ok: boolean;
  insertados: number;
  errores: { fila: number; error: string }[];
};

export async function importarProductosCSV(filas: CsvFila[]): Promise<ImportarCsvResult> {
  const session = await requireSession();

  if (filas.length === 0) return { ok: false, insertados: 0, errores: [{ fila: 0, error: 'El archivo no tiene filas' }] };
  if (filas.length > 500) return { ok: false, insertados: 0, errores: [{ fila: 0, error: 'Máximo 500 filas por importación' }] };

  // Resolver categorías por nombre (crear las que no existen)
  const categoriasUnicas = [...new Set(
    filas.map((f) => f.categoriaNombre?.trim()).filter(Boolean) as string[]
  )];

  const mapaCategoria: Record<string, string> = {};

  if (categoriasUnicas.length > 0) {
    const existentes = await db
      .select({ id: categorias.id, nombre: categorias.nombre })
      .from(categorias)
      .where(and(byTenant(session.tenantId, categorias), eq(categorias.activo, true)))
      .orderBy(asc(categorias.nombre));

    for (const nombre of categoriasUnicas) {
      const encontrada = existentes.find(
        (c) => c.nombre.toLowerCase() === nombre.toLowerCase()
      );
      if (encontrada) {
        mapaCategoria[nombre] = encontrada.id;
      } else {
        const [nueva] = await db
          .insert(categorias)
          .values({ tenantId: session.tenantId, nombre })
          .returning({ id: categorias.id });
        if (nueva) mapaCategoria[nombre] = nueva.id;
      }
    }
  }

  const errores: { fila: number; error: string }[] = [];
  const valoresValidos: (typeof productos.$inferInsert)[] = [];

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i]!;
    const numero = i + 2; // +2 porque la fila 1 es el header

    const nombreTrimmed = fila.nombre.trim();
    if (!nombreTrimmed) { errores.push({ fila: numero, error: 'Nombre vacío' }); continue; }

    const precioMin = Number(fila.precioMinorista);
    if (isNaN(precioMin) || precioMin < 0) { errores.push({ fila: numero, error: 'Precio minorista inválido' }); continue; }

    const precioMay = fila.precioMayorista ? Number(fila.precioMayorista) : precioMin;
    if (isNaN(precioMay) || precioMay < 0) { errores.push({ fila: numero, error: 'Precio mayorista inválido' }); continue; }

    const categoriaId = fila.categoriaNombre ? (mapaCategoria[fila.categoriaNombre.trim()] ?? null) : null;

    valoresValidos.push({
      tenantId: session.tenantId,
      nombre: nombreTrimmed,
      codigo: fila.codigo?.trim() || null,
      categoriaId,
      tipoUnidad: 'por_unidad',
      stockActual: '0',
      costoPromedio: '0',
      precioMayorista: precioMay.toFixed(2),
      precioMinorista: precioMin.toFixed(2),
      activo: true,
    });
  }

  let insertados = 0;
  if (valoresValidos.length > 0) {
    try {
      const LOTE = 100;
      for (let i = 0; i < valoresValidos.length; i += LOTE) {
        await db.insert(productos).values(valoresValidos.slice(i, i + LOTE));
        insertados += Math.min(LOTE, valoresValidos.length - i);
      }
    } catch (e) {
      return {
        ok: false,
        insertados,
        errores: [{ fila: 0, error: e instanceof Error ? e.message : 'Error al insertar en la base de datos' }],
      };
    }
  }

  revalidatePath('/dashboard/productos');
  return { ok: true, insertados, errores };
}
