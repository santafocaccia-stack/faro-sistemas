'use server';

import { eq, and, asc, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import {
  proveedores, productoProveedores, productos,
} from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requireSession } from '@/server/auth/session';

export type ProveedorInput = {
  nombre: string;
  contacto?: string | null;
  diasPedido: string[];
  markupMayorista: string;
  markupMinorista: string;
};

export async function listarProveedores() {
  const session = await requireSession();
  return db
    .select()
    .from(proveedores)
    .where(and(byTenant(session.tenantId, proveedores), eq(proveedores.activo, true)))
    .orderBy(asc(proveedores.nombre));
}

export async function obtenerProveedor(id: string) {
  const session = await requireSession();
  const [prov] = await db
    .select()
    .from(proveedores)
    .where(and(byTenant(session.tenantId, proveedores), eq(proveedores.id, id)))
    .limit(1);
  if (!prov) return null;

  // Productos vinculados a este proveedor
  const vinculados = await db
    .select({
      rel: productoProveedores,
      producto: productos,
    })
    .from(productoProveedores)
    .innerJoin(productos, eq(productoProveedores.productoId, productos.id))
    .where(and(byTenant(session.tenantId, productoProveedores), eq(productoProveedores.proveedorId, id)))
    .orderBy(asc(productos.nombre));

  return { ...prov, vinculados };
}

export async function crearProveedor(input: ProveedorInput) {
  const session = await requireSession();
  const [row] = await db
    .insert(proveedores)
    .values({
      tenantId: session.tenantId,
      nombre: input.nombre.trim(),
      contacto: input.contacto?.trim() || null,
      diasPedido: input.diasPedido,
      markupMayorista: input.markupMayorista,
      markupMinorista: input.markupMinorista,
    })
    .returning();
  revalidatePath('/dashboard/proveedores');
  return row!;
}

export async function actualizarProveedor(id: string, input: ProveedorInput) {
  const session = await requireSession();
  await db
    .update(proveedores)
    .set({
      nombre: input.nombre.trim(),
      contacto: input.contacto?.trim() || null,
      diasPedido: input.diasPedido,
      markupMayorista: input.markupMayorista,
      markupMinorista: input.markupMinorista,
    })
    .where(and(byTenant(session.tenantId, proveedores), eq(proveedores.id, id)));
  revalidatePath('/dashboard/proveedores');
  revalidatePath(`/dashboard/proveedores/${id}`);
}

export async function desactivarProveedor(id: string) {
  const session = await requireSession();
  await db
    .update(proveedores)
    .set({ activo: false })
    .where(and(byTenant(session.tenantId, proveedores), eq(proveedores.id, id)));
  revalidatePath('/dashboard/proveedores');
}

// ── Relación producto ↔ proveedor ─────────────────────────────────────────────

export type VinculoProveedorInput = {
  proveedorId: string;
  precioCosto: string;
  markupMayorista?: string | null;
  markupMinorista?: string | null;
  esPrincipal: boolean;
};

export async function sincronizarProveedoresProducto(
  productoId: string,
  vinculos: VinculoProveedorInput[],
) {
  const session = await requireSession();

  await db.transaction(async (tx) => {
    // Borrar vínculos existentes del producto
    await tx
      .delete(productoProveedores)
      .where(
        and(
          byTenant(session.tenantId, productoProveedores),
          eq(productoProveedores.productoId, productoId),
        ),
      );

    if (vinculos.length === 0) return;

    // Garantizar que solo uno sea principal
    const hayPrincipal = vinculos.some((v) => v.esPrincipal);
    const vinculosNormalizados = vinculos.map((v, i) => ({
      ...v,
      esPrincipal: hayPrincipal ? v.esPrincipal : i === 0,
    }));

    await tx.insert(productoProveedores).values(
      vinculosNormalizados.map((v) => ({
        tenantId: session.tenantId,
        productoId,
        proveedorId: v.proveedorId,
        precioCosto: v.precioCosto,
        markupMayorista: v.markupMayorista || null,
        markupMinorista: v.markupMinorista || null,
        esPrincipal: v.esPrincipal,
      })),
    );
  });

  revalidatePath(`/dashboard/productos/${productoId}`);
}

export async function listarVinculosProducto(productoId: string) {
  const session = await requireSession();
  return db
    .select({
      rel: productoProveedores,
      proveedor: proveedores,
    })
    .from(productoProveedores)
    .innerJoin(proveedores, eq(productoProveedores.proveedorId, proveedores.id))
    .where(
      and(
        byTenant(session.tenantId, productoProveedores),
        eq(productoProveedores.productoId, productoId),
      ),
    )
    .orderBy(desc(productoProveedores.esPrincipal), asc(proveedores.nombre));
}
