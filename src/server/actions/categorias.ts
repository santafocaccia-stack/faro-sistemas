'use server';

import { eq, and, asc, ilike } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { withTenant } from '@/server/db';
import { categorias, gruposVariantes, productos } from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requireSession } from '@/server/auth/session';

// ── Categorías ───────────────────────────────────────────────────────────────

export async function listarCategorias() {
  const session = await requireSession();
  return withTenant(session.tenantId, (db) =>
    db
      .select()
      .from(categorias)
      .where(and(byTenant(session.tenantId, categorias), eq(categorias.activo, true)))
      .orderBy(asc(categorias.nombre)),
  );
}

export async function crearCategoria(nombre: string) {
  const session = await requireSession();
  const [row] = await withTenant(session.tenantId, (db) =>
    db
      .insert(categorias)
      .values({ tenantId: session.tenantId, nombre: nombre.trim() })
      .returning(),
  );
  revalidatePath('/dashboard/productos');
  return row!;
}

export async function actualizarCategoria(id: string, nombre: string) {
  const session = await requireSession();
  await withTenant(session.tenantId, (db) =>
    db
      .update(categorias)
      .set({ nombre: nombre.trim() })
      .where(and(byTenant(session.tenantId, categorias), eq(categorias.id, id))),
  );
  revalidatePath('/dashboard/productos');
}

export async function eliminarCategoria(id: string) {
  const session = await requireSession();
  // Soft delete: marcar inactiva
  await withTenant(session.tenantId, (db) =>
    db
      .update(categorias)
      .set({ activo: false })
      .where(and(byTenant(session.tenantId, categorias), eq(categorias.id, id))),
  );
  revalidatePath('/dashboard/productos');
}

// ── Grupos de variantes ───────────────────────────────────────────────────────

export async function listarGruposVariantes() {
  const session = await requireSession();
  return withTenant(session.tenantId, (db) =>
    db
      .select()
      .from(gruposVariantes)
      .where(byTenant(session.tenantId, gruposVariantes))
      .orderBy(asc(gruposVariantes.nombre)),
  );
}

export async function crearGrupoVariante(nombre: string) {
  const session = await requireSession();
  const [row] = await withTenant(session.tenantId, (db) =>
    db
      .insert(gruposVariantes)
      .values({ tenantId: session.tenantId, nombre: nombre.trim() })
      .returning(),
  );
  revalidatePath('/dashboard/productos');
  return row!;
}

export async function actualizarGrupoVariante(id: string, nombre: string) {
  const session = await requireSession();
  await withTenant(session.tenantId, (db) =>
    db
      .update(gruposVariantes)
      .set({ nombre: nombre.trim() })
      .where(and(byTenant(session.tenantId, gruposVariantes), eq(gruposVariantes.id, id))),
  );
  revalidatePath('/dashboard/productos');
}

export async function buscarVariantesSugeridas(nombre: string, excluirId?: string): Promise<{
  primeraWord: string;
  productos: { id: string; nombre: string }[];
  grupoExistente: { id: string; nombre: string } | null;
} | null> {
  const session = await requireSession();

  const primeraWord = nombre.trim().split(/\s+/)[0] ?? '';
  if (primeraWord.length < 3) return null;

  return withTenant(session.tenantId, async (db) => {
    const filas = await db
      .select({
        id: productos.id,
        nombre: productos.nombre,
        grupoVarianteId: productos.grupoVarianteId,
      })
      .from(productos)
      .where(
        and(
          byTenant(session.tenantId, productos),
          eq(productos.activo, true),
          ilike(productos.nombre, `${primeraWord}%`),
        ),
      )
      .limit(10);

    const coincidencias = filas.filter((p) => p.id !== excluirId);
    if (coincidencias.length === 0) return null;

    // Buscar si alguno ya tiene grupo de variantes
    const idGrupo = coincidencias.find((p) => p.grupoVarianteId)?.grupoVarianteId ?? null;
    let grupoExistente: { id: string; nombre: string } | null = null;
    if (idGrupo) {
      const [g] = await db
        .select({ id: gruposVariantes.id, nombre: gruposVariantes.nombre })
        .from(gruposVariantes)
        .where(and(byTenant(session.tenantId, gruposVariantes), eq(gruposVariantes.id, idGrupo)))
        .limit(1);
      grupoExistente = g ?? null;
    }

    return {
      primeraWord,
      productos: coincidencias.map(({ id, nombre }) => ({ id, nombre })),
      grupoExistente,
    };
  });
}

export async function eliminarGrupoVariante(id: string) {
  const session = await requireSession();
  await withTenant(session.tenantId, (db) =>
    db
      .delete(gruposVariantes)
      .where(and(byTenant(session.tenantId, gruposVariantes), eq(gruposVariantes.id, id))),
  );
  revalidatePath('/dashboard/productos');
}

/**
 * Devuelve todos los productos activos de un mismo grupo de variantes,
 * excluyendo opcionalmente el producto actual.
 */
export async function listarProductosDeGrupo(
  grupoVarianteId: string,
  excluirProductoId?: string,
) {
  const session = await requireSession();
  const filas = await withTenant(session.tenantId, (db) =>
    db
      .select({
        id:              productos.id,
        nombre:          productos.nombre,
        codigo:          productos.codigo,
        precioMinorista: productos.precioMinorista,
        precioMayorista: productos.precioMayorista,
        stockActual:     productos.stockActual,
        tipoUnidad:      productos.tipoUnidad,
      })
      .from(productos)
      .where(
        and(
          byTenant(session.tenantId, productos),
          eq(productos.activo, true),
          eq(productos.grupoVarianteId, grupoVarianteId),
        ),
      )
      .orderBy(asc(productos.nombre)),
  );

  return excluirProductoId
    ? filas.filter((p) => p.id !== excluirProductoId)
    : filas;
}
