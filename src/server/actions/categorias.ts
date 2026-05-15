'use server';

import { eq, and, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { categorias, gruposVariantes } from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requireSession } from '@/server/auth/session';

// ── Categorías ───────────────────────────────────────────────────────────────

export async function listarCategorias() {
  const session = await requireSession();
  return db
    .select()
    .from(categorias)
    .where(and(byTenant(session.tenantId, categorias), eq(categorias.activo, true)))
    .orderBy(asc(categorias.nombre));
}

export async function crearCategoria(nombre: string) {
  const session = await requireSession();
  const [row] = await db
    .insert(categorias)
    .values({ tenantId: session.tenantId, nombre: nombre.trim() })
    .returning();
  revalidatePath('/dashboard/productos');
  return row!;
}

export async function actualizarCategoria(id: string, nombre: string) {
  const session = await requireSession();
  await db
    .update(categorias)
    .set({ nombre: nombre.trim() })
    .where(and(byTenant(session.tenantId, categorias), eq(categorias.id, id)));
  revalidatePath('/dashboard/productos');
}

export async function eliminarCategoria(id: string) {
  const session = await requireSession();
  // Soft delete: marcar inactiva
  await db
    .update(categorias)
    .set({ activo: false })
    .where(and(byTenant(session.tenantId, categorias), eq(categorias.id, id)));
  revalidatePath('/dashboard/productos');
}

// ── Grupos de variantes ───────────────────────────────────────────────────────

export async function listarGruposVariantes() {
  const session = await requireSession();
  return db
    .select()
    .from(gruposVariantes)
    .where(byTenant(session.tenantId, gruposVariantes))
    .orderBy(asc(gruposVariantes.nombre));
}

export async function crearGrupoVariante(nombre: string) {
  const session = await requireSession();
  const [row] = await db
    .insert(gruposVariantes)
    .values({ tenantId: session.tenantId, nombre: nombre.trim() })
    .returning();
  revalidatePath('/dashboard/productos');
  return row!;
}

export async function actualizarGrupoVariante(id: string, nombre: string) {
  const session = await requireSession();
  await db
    .update(gruposVariantes)
    .set({ nombre: nombre.trim() })
    .where(and(byTenant(session.tenantId, gruposVariantes), eq(gruposVariantes.id, id)));
  revalidatePath('/dashboard/productos');
}

export async function eliminarGrupoVariante(id: string) {
  const session = await requireSession();
  await db
    .delete(gruposVariantes)
    .where(and(byTenant(session.tenantId, gruposVariantes), eq(gruposVariantes.id, id)));
  revalidatePath('/dashboard/productos');
}
