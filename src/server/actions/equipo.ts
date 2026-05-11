'use server';

import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db';
import { users, usersTenants, type Rol } from '@/server/db/schema';
import { requireSession, requireRol } from '@/server/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

/* ── Tipos ── */
export type MiembroEquipo = {
  userId: string;
  email: string;
  nombreCompleto: string | null;
  rol: Rol;
  creadoEn: Date;
};

/* ── Listar miembros del tenant ── */
export async function listarEquipo(): Promise<MiembroEquipo[]> {
  const session = await requireSession();

  const rows = await db
    .select({
      userId: usersTenants.userId,
      email: users.email,
      nombreCompleto: users.nombreCompleto,
      rol: usersTenants.rol,
      creadoEn: usersTenants.createdAt,
    })
    .from(usersTenants)
    .innerJoin(users, eq(usersTenants.userId, users.id))
    .where(eq(usersTenants.tenantId, session.tenantId))
    .orderBy(usersTenants.createdAt);

  return rows;
}

/* ── Invitar un nuevo miembro ── */
export type InviteInput = {
  email: string;
  rol: Rol;
};

export async function invitarMiembro(input: InviteInput) {
  // Solo owners y admins pueden invitar
  const session = await requireRol(['owner', 'admin']);

  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error('El email es obligatorio');

  // Verificar que no sea ya miembro
  const [existente] = await db
    .select({ userId: usersTenants.userId })
    .from(usersTenants)
    .innerJoin(users, eq(usersTenants.userId, users.id))
    .where(
      and(
        eq(usersTenants.tenantId, session.tenantId),
        eq(users.email, email),
      )
    )
    .limit(1);

  if (existente) throw new Error('Ese email ya es miembro del equipo');

  // Usar Admin API para enviar la invitación
  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL no está configurada — los emails de invitación no pueden enviarse sin la URL de la app');

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/dashboard`,
    data: {
      invited_tenant_id: session.tenantId,
      invited_rol: input.rol,
    },
  });

  if (error) throw new Error(`Error al invitar: ${error.message}`);

  // Si el usuario ya existe en Supabase Auth pero no en nuestra tabla,
  // lo registramos ahora mismo (no necesita confirmar el email)
  if (data.user) {
    const userId = data.user.id;

    // Upsert en tabla users
    await db
      .insert(users)
      .values({ id: userId, email })
      .onConflictDoNothing();

    // Agregar al tenant
    await db
      .insert(usersTenants)
      .values({ userId, tenantId: session.tenantId, rol: input.rol })
      .onConflictDoNothing();
  }

  revalidatePath('/dashboard/config/equipo');
}

/* ── Cambiar rol de un miembro ── */
export async function cambiarRol(userId: string, nuevoRol: Rol) {
  const session = await requireRol(['owner', 'admin']);

  // El owner no puede perder su propio rol de owner
  if (userId === session.userId && nuevoRol !== 'owner') {
    throw new Error('No podés cambiar tu propio rol');
  }

  await db
    .update(usersTenants)
    .set({ rol: nuevoRol })
    .where(
      and(
        eq(usersTenants.tenantId, session.tenantId),
        eq(usersTenants.userId, userId),
      )
    );

  revalidatePath('/dashboard/config/equipo');
}

/* ── Eliminar miembro ── */
export async function eliminarMiembro(userId: string) {
  const session = await requireRol(['owner', 'admin']);

  if (userId === session.userId) {
    throw new Error('No podés eliminarte a vos mismo del equipo');
  }

  await db
    .delete(usersTenants)
    .where(
      and(
        eq(usersTenants.tenantId, session.tenantId),
        eq(usersTenants.userId, userId),
      )
    );

  revalidatePath('/dashboard/config/equipo');
}
