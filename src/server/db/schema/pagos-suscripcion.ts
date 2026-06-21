/**
 * Pagos de suscripción — cobro de Gesto al negocio (tenant) por transferencia.
 *
 * Flujo manual (mientras no haya cobro automático por MP/Mobbex):
 *   1. El cliente transfiere y aprieta "Ya transferí" en /planes →
 *      se crea un registro estado='avisado' (NO activa nada) + email al admin.
 *   2. El super-admin verifica la plata en su cuenta y confirma desde el panel →
 *      estado='confirmado', se activa el tenant y se extiende subscription_end
 *      un mes desde max(hoy, vencimiento actual). Email de comprobante al cliente.
 *
 * Es un comprobante de pago, NO una factura fiscal AFIP (eso va por Tusfacturas).
 * Montos en numeric(12,2). Un tenant puede tener varios pagos (historial).
 */
import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { tenants, planGesto } from './tenants';

export const pagoSuscripcionEstado = pgEnum('pago_suscripcion_estado', [
  'avisado',    // el cliente dijo que transfirió — pendiente de verificar
  'confirmado', // el super-admin verificó y activó la suscripción
  'rechazado',  // no se encontró la transferencia / aviso inválido
]);

export const pagosSuscripcion = pgTable(
  'pagos_suscripcion',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    plan: planGesto('plan').notNull(), // plan que se está pagando
    estado: pagoSuscripcionEstado('estado').notNull().default('avisado'),
    metodo: text('metodo').notNull().default('transferencia'),

    // Monto cobrado (snapshot del momento del aviso)
    precioUsd: numeric('precio_usd', { precision: 8, scale: 2 }).notNull(),
    dolarMep: numeric('dolar_mep', { precision: 12, scale: 2 }).notNull(),
    montoArs: numeric('monto_ars', { precision: 12, scale: 2 }).notNull(),

    // Período que cubre este pago (se completa al confirmar)
    periodoDesde: timestamp('periodo_desde', { withTimezone: true }),
    periodoHasta: timestamp('periodo_hasta', { withTimezone: true }),

    // Trazabilidad
    avisadoEn: timestamp('avisado_en', { withTimezone: true }).notNull().defaultNow(),
    confirmadoEn: timestamp('confirmado_en', { withTimezone: true }),
    confirmadoPor: text('confirmado_por'), // email del super-admin que confirmó
    notas: text('notas'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('idx_pagos_suscripcion_tenant').on(t.tenantId),
    index('idx_pagos_suscripcion_estado').on(t.estado),
  ],
);

export type PagoSuscripcion = typeof pagosSuscripcion.$inferSelect;
export type NewPagoSuscripcion = typeof pagosSuscripcion.$inferInsert;
