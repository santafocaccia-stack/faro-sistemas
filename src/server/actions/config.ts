'use server';

import { eq } from 'drizzle-orm';
import { withTenant } from '@/server/db';
import { tenants } from '@/server/db/schema';
import { requireSession, requirePermiso } from '@/server/auth/session';
import { margenObjetivoSchema, formatZodError } from '@/server/schemas';
import { revalidatePath } from 'next/cache';

export async function obtenerTenant() {
  const session = await requireSession();
  const [tenant] = await withTenant(session.tenantId, (db) =>
    db
      .select()
      .from(tenants)
      .where(eq(tenants.id, session.tenantId))
      .limit(1),
  );
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
  preciosVivos?: boolean;
  margenObjetivo?: string | number;
};

export async function actualizarConfig(input: ConfigInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requirePermiso('gestionar_config');
    if (!input.nombre.trim()) return { ok: false, error: 'El nombre del negocio es obligatorio' };
    // Topes de longitud (campos libres que luego van a PDFs, tickets y emails).
    const clamp = (v: string | null | undefined, max: number) =>
      (v?.trim() || null)?.slice(0, max) ?? null;

    // Validar margen objetivo solo si viene con valor (numeric(5,2): 0..999.99, sin NaN).
    let margenObjetivo: string | undefined;
    if (input.margenObjetivo !== undefined && input.margenObjetivo !== '') {
      const m = margenObjetivoSchema.safeParse(input.margenObjetivo);
      if (!m.success) return { ok: false, error: formatZodError(m.error) };
      margenObjetivo = m.data.toFixed(2);
    }

    await withTenant(session.tenantId, (db) =>
      db
      .update(tenants)
      .set({
        nombre:            input.nombre.trim().slice(0, 120),
        cuit:              clamp(input.cuit, 20),
        direccion:         clamp(input.direccion, 200),
        telefono:          clamp(input.telefono, 40),
        emailNegocio:      clamp(input.emailNegocio, 120),
        habilitaMayorista: input.habilitaMayorista,
        habilitaMinorista: input.habilitaMinorista,
        ...(input.preciosVivos !== undefined ? { preciosVivos: input.preciosVivos } : {}),
        ...(margenObjetivo !== undefined ? { margenObjetivo } : {}),
      })
      .where(eq(tenants.id, session.tenantId)),
    );

    revalidatePath('/dashboard/config');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error al guardar' };
  }
}
