'use server';

import { eq, and } from 'drizzle-orm';
import { withTenant, dbAdmin } from '@/server/db';
import { users, usersTenants, type Rol } from '@/server/db/schema';
import { requirePermiso } from '@/server/auth/session';
import {
  permisosEfectivos,
  TODOS_LOS_PERMISOS,
  type Permiso,
} from '@/lib/permisos';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAppUrl } from '@/lib/app-url';
import { revalidatePath } from 'next/cache';
import { err, ok, type ActionResult } from '@/lib/errors';

/* ── Tipos ── */
export type MiembroEquipo = {
  userId: string;
  email: string;
  nombreCompleto: string | null;
  rol: Rol;
  permisos: Permiso[] | null; // null = usa los permisos por defecto del rol
  creadoEn: Date;
};

/* ── Listar miembros del tenant ── */
export async function listarEquipo(): Promise<MiembroEquipo[]> {
  const session = await requirePermiso('gestionar_equipo');

  return withTenant(session.tenantId, (db) =>
    db
      .select({
        userId: usersTenants.userId,
        email: users.email,
        nombreCompleto: users.nombreCompleto,
        rol: usersTenants.rol,
        permisos: usersTenants.permisos,
        creadoEn: usersTenants.createdAt,
      })
      .from(usersTenants)
      .innerJoin(users, eq(usersTenants.userId, users.id))
      .where(eq(usersTenants.tenantId, session.tenantId))
      .orderBy(usersTenants.createdAt),
  );
}

/* ── Invitar un nuevo miembro ── */
export type InviteInput = {
  email: string;
  rol: Rol;
};

export type InvitarResult = ActionResult<{ mensaje: string }>;

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
  // Requiere el permiso de equipo (owner/admin por defecto)
  const session = await requirePermiso('gestionar_equipo');

  // Solo un owner puede invitar a alguien como owner (evita escalación vía invitación).
  if (input.rol === 'owner' && session.rol !== 'owner') {
    return err('SIN_PERMISO', 'Solo el dueño puede invitar a otro dueño');
  }

  const email = input.email.trim().toLowerCase();
  if (!email) return err('CAMPO_REQUERIDO', 'El email es obligatorio');

  // Verificar que no sea ya miembro de ESTE tenant
  const [yaMiembro] = await withTenant(session.tenantId, (db) =>
    db
      .select({ userId: usersTenants.userId })
      .from(usersTenants)
      .innerJoin(users, eq(usersTenants.userId, users.id))
      .where(
        and(
          eq(usersTenants.tenantId, session.tenantId),
          eq(users.email, email),
        )
      )
      .limit(1),
  );

  if (yaMiembro) return err('YA_EXISTE', 'Ese email ya es miembro del equipo');

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
      return err('ERROR_INTERNO', `No se pudo invitar: ${error?.message ?? 'error desconocido'}`);
    }
  }

  if (!userId) {
    return err('ERROR_INTERNO', 'No se pudo determinar el usuario a agregar');
  }

  // Registrar en nuestras tablas
  try {
    // Limpiar fila huérfana: si quedó una fila en public.users con este
    // email pero otro id (el usuario fue borrado de Auth y recreado, sin
    // trigger que sincronice), la eliminamos para no chocar el UNIQUE(email).
    // dbAdmin: `users` es tabla global y la limpieza de huérfanos es
    // cross-tenant a propósito (borra membresías de un id que YA NO existe
    // en Auth — verificado abajo — en todos los tenants).
    const [filaVieja] = await dbAdmin
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (filaVieja && filaVieja.id !== userId) {
      // SEGURIDAD: solo borrar si la fila está REALMENTE huérfana, es decir, si
      // su id ya no existe en Supabase Auth. Sin este chequeo, invitar el email
      // de un usuario activo (con id desincronizado) borraría sus membresías en
      // TODOS sus tenants (escritura cross-tenant disparada por una invitación).
      const { data: authUser } = await admin.auth.admin.getUserById(filaVieja.id);
      if (authUser?.user) {
        return err('YA_EXISTE', 'Ese email pertenece a una cuenta activa. No se puede reasignar.');
      }
      await dbAdmin.delete(usersTenants).where(eq(usersTenants.userId, filaVieja.id));
      await dbAdmin.delete(users).where(eq(users.id, filaVieja.id));
    }

    await dbAdmin.insert(users).values({ id: userId, email }).onConflictDoNothing();
    await withTenant(session.tenantId, (db) =>
      db
        .insert(usersTenants)
        .values({ userId, tenantId: session.tenantId, rol: input.rol })
        .onConflictDoNothing(),
    );
  } catch (e) {
    console.error('[invitarMiembro] DB insert:', e);
    return err('ERROR_INTERNO', 'No se pudo registrar el miembro en el equipo');
  }

  revalidatePath('/dashboard/config/equipo');
  return ok({ mensaje });
}

/* ── Cambiar rol de un miembro ── */
export async function cambiarRol(userId: string, nuevoRol: Rol) {
  const session = await requirePermiso('gestionar_equipo');

  // Solo un owner puede otorgar el rol owner (evita que un admin se auto-ascienda).
  if (nuevoRol === 'owner' && session.rol !== 'owner') {
    throw new Error('Solo el dueño puede asignar el rol de dueño');
  }

  // El owner no puede perder su propio rol de owner
  if (userId === session.userId && nuevoRol !== 'owner') {
    throw new Error('No podés cambiar tu propio rol');
  }

  // Cambiar de rol resetea los permisos al preset del nuevo rol (limpia overrides).
  await withTenant(session.tenantId, (db) =>
    db
      .update(usersTenants)
      .set({ rol: nuevoRol, permisos: null })
      .where(
        and(
          eq(usersTenants.tenantId, session.tenantId),
          eq(usersTenants.userId, userId),
        )
      ),
  );

  revalidatePath('/dashboard/config/equipo');
}

/* ── Guardar permisos granulares de un miembro ── */
export async function guardarPermisos(userId: string, permisos: Permiso[] | null) {
  const session = await requirePermiso('gestionar_equipo');

  // No podés editar tus propios permisos (evita auto-bloqueo / auto-escalada).
  if (userId === session.userId) {
    throw new Error('No podés editar tus propios permisos');
  }

  // Validar el target dentro del tenant y su rol.
  const [target] = await withTenant(session.tenantId, (db) =>
    db
      .select({ rol: usersTenants.rol })
      .from(usersTenants)
      .where(and(eq(usersTenants.tenantId, session.tenantId), eq(usersTenants.userId, userId)))
      .limit(1),
  );
  if (!target) throw new Error('El miembro no pertenece a este equipo');

  // A un dueño no se le editan permisos: siempre tiene acceso total.
  if (target.rol === 'owner') {
    throw new Error('No se pueden editar los permisos del dueño');
  }

  if (permisos !== null) {
    // Solo permisos válidos.
    const validos = permisos.filter((p): p is Permiso =>
      (TODOS_LOS_PERMISOS as readonly string[]).includes(p),
    );
    // Anti-escalada: un actor que no es dueño no puede otorgar permisos que él
    // mismo no tiene.
    if (session.rol !== 'owner') {
      const propios = permisosEfectivos(session);
      const excede = validos.some((p) => !propios.includes(p));
      if (excede) throw new Error('No podés asignar permisos que vos no tenés');
    }
    permisos = Array.from(new Set(validos));
  }

  await withTenant(session.tenantId, (db) =>
    db
      .update(usersTenants)
      .set({ permisos })
      .where(and(eq(usersTenants.tenantId, session.tenantId), eq(usersTenants.userId, userId))),
  );

  revalidatePath('/dashboard/config/equipo');
}

/* ── Eliminar miembro ── */
export async function eliminarMiembro(userId: string) {
  const session = await requirePermiso('gestionar_equipo');

  if (userId === session.userId) {
    throw new Error('No podés eliminarte a vos mismo del equipo');
  }

  await withTenant(session.tenantId, (db) =>
    db
      .delete(usersTenants)
      .where(
        and(
          eq(usersTenants.tenantId, session.tenantId),
          eq(usersTenants.userId, userId),
        )
      ),
  );

  revalidatePath('/dashboard/config/equipo');
}
