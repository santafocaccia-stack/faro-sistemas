/**
 * Audit log — registro inmutable de acciones críticas.
 * Quién hizo qué, cuándo y sobre qué entidad, con snapshots before/after.
 *
 * Reglas:
 * - Solo INSERT (nunca UPDATE ni DELETE en esta tabla).
 * - Se llama desde server actions, nunca desde el cliente.
 * - El campo `after` puede ser null en operaciones de borrado.
 */
import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export type AuditAccion =
  | 'venta.crear'
  | 'venta.anular'
  | 'cliente.crear'
  | 'cliente.editar'
  | 'cliente.eliminar'
  | 'producto.crear'
  | 'producto.editar'
  | 'producto.eliminar'
  | 'cc.ajuste'
  | 'config.editar'
  | 'equipo.invitar'
  | 'equipo.remover'
  | 'presupuesto.crear'
  | 'presupuesto.cobrar';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id:       uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    userId:   uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

    accion:   text('accion').notNull(),           // AuditAccion
    entidad:  text('entidad').notNull(),           // 'venta', 'cliente', 'producto', etc.
    entidadId: uuid('entidad_id'),                 // id del registro afectado
    before:   jsonb('before'),                     // snapshot previo (null en create)
    after:    jsonb('after'),                      // snapshot posterior (null en delete)
    meta:     jsonb('meta'),                       // datos extra (ip, user-agent, etc.)

    creadoAt: timestamp('creado_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_audit_tenant').on(t.tenantId),
    index('idx_audit_tenant_accion').on(t.tenantId, t.accion),
    index('idx_audit_tenant_fecha').on(t.tenantId, t.creadoAt),
    index('idx_audit_entidad').on(t.entidad, t.entidadId),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
