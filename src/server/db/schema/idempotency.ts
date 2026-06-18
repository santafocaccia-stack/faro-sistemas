/**
 * Idempotency keys — previene duplicados en operaciones financieras críticas.
 *
 * Flujo:
 * 1. El cliente genera un key único (UUID v4) antes de enviar la operación.
 * 2. El server action intenta INSERT con ese key.
 * 3. Si ya existe (UNIQUE violation) → retorna el resultado cacheado, sin re-ejecutar.
 * 4. Los registros expiran en 24 horas (limpieza vía cron o TTL).
 *
 * Aplica a: crearVenta, registrarPago, ajusteCuentaCorriente, cobrarPresupuesto.
 */
import { pgTable, uuid, text, timestamp, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id:        uuid('id').defaultRandom().primaryKey(),
    tenantId:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    key:       text('key').notNull(),         // UUID generado por el cliente
    operacion: text('operacion').notNull(),   // 'crearVenta', 'registrarPago', etc.
    resultado: jsonb('resultado'),            // payload de respuesta cacheado
    creadoAt:  timestamp('creado_at', { withTimezone: true }).notNull().defaultNow(),
    expiraAt:  timestamp('expira_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    unique('uniq_idempotency_tenant_key').on(t.tenantId, t.key),
    index('idx_idempotency_tenant').on(t.tenantId),
    index('idx_idempotency_expira').on(t.expiraAt),
  ],
);

export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;
