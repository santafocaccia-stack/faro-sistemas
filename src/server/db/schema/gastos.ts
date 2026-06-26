import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { metodoPagoEnum } from './cuenta-corriente';
import type { BalanceMensual } from '@/lib/balance';

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

/**
 * Balance mensual cerrado: snapshot de las cifras del mes + análisis (IA o
 * fallback) ya generado. Se persiste para no recalcular en cada visita y para
 * que la generación automática (cron, último día hábil) quede disponible al
 * dueño sin tener que apretar "Generar". Un único balance por (tenant, mes):
 * regenerar hace upsert.
 */
export const balancesMensuales = pgTable(
  'balances_mensuales',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    mes: text('mes').notNull(), // 'YYYY-MM' (calendario ART)
    analisis: text('analisis').notNull(),
    generadoPorIa: boolean('generado_por_ia').notNull().default(false),
    // Snapshot de las cifras al momento de cerrar el mes (para mostrar el
    // balance tal cual se analizó, sin depender de datos que cambien después).
    datos: jsonb('datos').$type<BalanceMensual>(),
    origen: text('origen').notNull().default('automatico'), // 'automatico' | 'manual'

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('uniq_balance_tenant_mes').on(t.tenantId, t.mes),
  ],
);

export type BalanceMensualGuardado = typeof balancesMensuales.$inferSelect;
export type NuevoBalanceMensualGuardado = typeof balancesMensuales.$inferInsert;
