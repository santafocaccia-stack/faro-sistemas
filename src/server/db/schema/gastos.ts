import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { metodoPagoEnum } from './cuenta-corriente';

/**
 * Gastos del negocio (egresos). Tenant-scoped, soft-delete.
 * Las categorías son texto libre con sugeridas por plan (ver `src/lib/gastos.ts`),
 * para no encajonar a cada rubro en un enum cerrado.
 * El balance mensual cruza estos gastos con los ingresos del plan (ventas,
 * cobros de presupuestos o cobranzas de préstamos según corresponda).
 */
export const gastos = pgTable(
  'gastos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Cuándo se hizo el gasto (la fecha la elige el usuario; default ahora).
    fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),

    categoria: text('categoria').notNull(),
    monto: numeric('monto', { precision: 14, scale: 2 }).notNull(),
    descripcion: text('descripcion'),
    metodoPago: metodoPagoEnum('metodo_pago'),

    // Quién lo cargó (email), para auditoría liviana.
    creadoPor: text('creado_por'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_gastos_tenant').on(t.tenantId),
    index('idx_gastos_tenant_fecha').on(t.tenantId, t.fecha),
  ],
);

export type Gasto = typeof gastos.$inferSelect;
export type NuevoGasto = typeof gastos.$inferInsert;
