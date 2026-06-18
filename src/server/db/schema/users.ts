/**
 * Users — espejo de la tabla auth.users de Supabase, con datos extendidos.
 * Una persona puede pertenecer a múltiples tenants (relación N:M en users_tenants).
 *
 * El id es el mismo que el de auth.users (Supabase). NO se crea aparte —
 * se sincroniza vía trigger o vía server action en el signup.
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  pgEnum,
  primaryKey,
  unique,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import type { Permiso } from '@/lib/permisos';

export const rolEnum = pgEnum('rol_tenant', [
  'owner',     // dueño del negocio — todos los permisos
  'admin',     // administrador — casi todo permiso
  'empleado',  // permisos limitados (no borrar datos, no exportar masivo)
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),                     // === auth.users.id de Supabase
  email: text('email').notNull().unique(),
  nombreCompleto: text('nombre_completo'),
  telefono: text('telefono'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Relación entre usuarios y tenants — permite que una misma persona
 * tenga roles distintos en distintos tenants (caso típico: contador con
 * acceso a varios negocios).
 */
export const usersTenants = pgTable(
  'users_tenants',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    rol: rolEnum('rol').notNull().default('empleado'),
    // Overrides de permisos para este usuario en este tenant.
    // null → usa los permisos por defecto del rol.
    // [] o array → reemplaza completamente los permisos del rol.
    permisos: jsonb('permisos').$type<Permiso[]>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.tenantId] }),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserTenant = typeof usersTenants.$inferSelect;
export type NewUserTenant = typeof usersTenants.$inferInsert;
export type Rol = (typeof rolEnum.enumValues)[number];
