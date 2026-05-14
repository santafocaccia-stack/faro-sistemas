'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { tenants } from '@/server/db/schema';
import { requireSession } from '@/server/auth/session';
import { revalidatePath } from 'next/cache';

export async function obtenerTenant() {
  const session = await requireSession();
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, session.tenantId))
    .limit(1);
  return tenant ?? null;
}

export type ConfigInput = {
  nombre: string;
  cuit?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  emailNegocio?: string | null;
  habilitaMayorista: boolean;
  habilitaMinorista: boolean;
};

export async function actualizarConfig(input: ConfigInput) {
  const session = await requireSession();
  if (!input.nombre.trim()) throw new Error('El nombre del negocio es obligatorio');

  await db
    .update(tenants)
    .set({
      nombre:            input.nombre.trim(),
      cuit:              input.cuit?.trim() || null,
      direccion:         input.direccion?.trim() || null,
      telefono:          input.telefono?.trim() || null,
      emailNegocio:      input.emailNegocio?.trim() || null,
      habilitaMayorista: input.habilitaMayorista,
      habilitaMinorista: input.habilitaMinorista,
    })
    .where(eq(tenants.id, session.tenantId));

  revalidatePath('/dashboard/config');
}
