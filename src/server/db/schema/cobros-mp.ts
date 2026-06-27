/**
 * Cobros con Mercado Pago (Checkout Pro / QR dinámico).
 *
 * Cada fila es un intento de cobro: se crea cuando el cajero genera el QR, y se
 * va actualizando según lo que reporta MP (polling + webhook). El dinero va
 * directo a la cuenta MP del negocio (token OAuth del tenant), no pasa por la
 * plataforma.
 *
 * Aislado de `ventas` a propósito: el cobro se crea ANTES de registrar la venta
 * (sobre el total del carrito) y la venta se registra recién cuando MP aprueba.
 * Por eso `ventaId` es nullable y se completa al final.
 */
import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { ventas } from './ventas';

export const cobrosMp = pgTable(
  'cobros_mp',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Venta asociada — se completa cuando el pago se aprueba y se registra.
    ventaId: uuid('venta_id').references(() => ventas.id, { onDelete: 'set null' }),

    monto: numeric('monto', { precision: 12, scale: 2 }).notNull(),
    canal: text('canal').notNull().default('minorista'), // 'minorista' | 'mayorista'

    // Estado del cobro: pendiente → aprobado | rechazado | cancelado | expirado
    estado: text('estado').notNull().default('pendiente'),

    // Datos que devuelve MP
    preferenceId: text('preference_id'),
    paymentId: text('payment_id'),
    initPoint: text('init_point'), // URL del checkout → se renderiza como QR

    creadoPor: text('creado_por'), // email del cajero, auditoría liviana

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('idx_cobros_mp_tenant').on(t.tenantId),
    index('idx_cobros_mp_tenant_estado').on(t.tenantId, t.estado),
    index('idx_cobros_mp_venta').on(t.ventaId),
  ],
);

export type CobroMp = typeof cobrosMp.$inferSelect;
export type NuevoCobroMp = typeof cobrosMp.$inferInsert;
