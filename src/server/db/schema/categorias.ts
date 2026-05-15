import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const categorias = pgTable(
  'categorias',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    nombre: text('nombre').notNull(),
    activo: boolean('activo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_categorias_tenant').on(t.tenantId)],
);

export const gruposVariantes = pgTable(
  'grupos_variantes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    nombre: text('nombre').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_grupos_variantes_tenant').on(t.tenantId)],
);

export type Categoria = typeof categorias.$inferSelect;
export type GrupoVariante = typeof gruposVariantes.$inferSelect;
