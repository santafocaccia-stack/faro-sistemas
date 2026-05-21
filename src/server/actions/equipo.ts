'use server';

import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db';
import { users, usersTenants, type Rol } from '@/server/db/schema';
import { requireSession, requireRol } from '@/server/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAppUrl } from '@/lib/app-url';
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

export type InvitarResult =
  | { ok: true; mensaje: string }
  | { ok: false; error: string };

/** Busca un usuario en Supabase Auth por email (case-insensitive) */
async function buscarUsuarioAuthPorEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<{ id: string } | null> {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = data?.users.find((u) => u.email?.toLowerCase() === email);
  return found ? { id: found.id } : null;
}

export async function invitarMiembro(input: InviteInput): Promise<InvitarResult> {
  // Solo owners y admins pueden invitar
  const session = await requireRol(['owner', 'admin']);

  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false, error: 'El email es obligatorio' };

  // Verificar que no sea ya miembro de ESTE tenant
  const [yaMiembro] = await db
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

  if (yaMiembro) return { ok: false, error: 'Ese email ya es miembro del equipo' };

  const admin = createAdminClient();
  const appUrl = getAppUrl();

  let userId: string | null = null;
  let mensaje = `Invitación enviada a ${email}`;

  // Intentar crear el usuario + enviar email de invitación.
  // redirectTo apunta a /reset-password: el invitado define su contraseña
  // antes de entrar.
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
    data: {
      invited_tenant_id: session.tenantId,
      invited_rol: input.rol,
    },
  });

  if (data?.user) {
    // Usuario nuevo creado + email enviado
    userId = data.user.id;
  } else {
    // inviteUserByEmail falla si el email ya existe en Supabase Auth
    // (ej: lo invitaron antes). Lo buscamos para sumarlo al equipo igual.
    const existente = await buscarUsuarioAuthPorEmail(admin, email);
    if (existente) {
      userId = existente.id;
      mensaje = `${email} ya tenía cuenta — se sumó al equipo. Puede entrar con su contraseña.`;
    } else {
      console.error('[invitarMiembro] inviteUserByEmail:', error);
      return {
        ok: false,
        error: `No se pudo invitar: ${error?.message ?? 'error desconocido'}`,
      };
    }
  }

  if (!userId) {
    return { ok: false, error: 'No se pudo determinar el usuario a agregar' };
  }

  // Registrar en nuestras tablas
  try {
    // Limpiar fila huérfana: si quedó una fila en public.users con este
    // email pero otro id (el usuario fue borrado de Auth y recreado, sin
    // trigger que sincronice), la eliminamos para no chocar el UNIQUE(email).
    const [filaVieja] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (filaVieja && filaVieja.id !== userId) {
      await db.delete(usersTenants).where(eq(usersTenants.userId, filaVieja.id));
      await db.delete(users).where(eq(users.id, filaVieja.id));
    }

    await db.insert(users).values({ id: userId, email }).onConflictDoNothing();
    await db
      .insert(usersTenants)
      .values({ userId, tenantId: session.tenantId, rol: input.rol })
      .onConflictDoNothing();
  } catch (err) {
    console.error('[invitarMiembro] DB insert:', err);
    return { ok: false, error: 'No se pudo registrar el miembro en el equipo' };
  }

  revalidatePath('/dashboard/config/equipo');
  return { ok: true, mensaje };
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
