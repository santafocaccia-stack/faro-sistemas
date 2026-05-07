/**
 * Tenants — cada tenant es un negocio que usa la plataforma.
 * Multi-tenancy: TODO lo demás cuelga de un tenant_id.
 */
import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const planTier = pgEnum('plan_tier', ['basico', 'pro', 'plus']);
export const tenantStatus = pgEnum('tenant_status', [
  'trial',         // período de prueba activo
  'activo',        // pagando al día
  'moroso',        // pago rebotó, en gracia
  'suspendido',    // suspendido por falta de pago
  'cancelado',     // dado de baja
]);

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Identificación
  nombre: text('nombre').notNull(),               // "Carnicería El Toro"
  slug: text('slug').notNull().unique(),           // "el-toro" — para URLs si se necesita
  cuit: text('cuit'),                              // CUIT fiscal del negocio

  // Plan y suscripción
  plan: planTier('plan').notNull().default('basico'),
  status: tenantStatus('status').notNull().default('trial'),
  trialEnd: timestamp('trial_end', { withTimezone: true }),
  subscriptionEnd: timestamp('subscription_end', { withTimezone: true }),

  // Configuración del negocio
  zonaHoraria: text('zona_horaria').notNull().default('America/Argentina/Buenos_Aires'),
  habilitaMayorista: boolean('habilita_mayorista').notNull().default(true),
  habilitaMinorista: boolean('habilita_minorista').notNull().default(true),

  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
