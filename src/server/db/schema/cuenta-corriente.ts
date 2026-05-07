/**
 * Cuenta corriente — ledger de débitos y créditos por cliente, y tabla
 * de pagos recibidos.
 *
 * Modelo:
 *  - `pagos` registra cada cobro real (efectivo, transferencia, MP, etc.)
 *  - `movimientosCuentaCorriente` es el libro mayor: un asiento por cada
 *    venta a cuenta corriente (debe), pago recibido (haber), nota de crédito,
 *    o ajuste manual.
 *
 * Convención de signos:
 *  - debe (>0): el cliente AUMENTA su deuda con el negocio
 *  - haber (>0): el cliente DISMINUYE su deuda con el negocio
 *  - El saldo del cliente en `clientes.saldoActual` se actualiza
 *    transaccionalmente con cada movimiento.
 *
 * Inmutabilidad:
 *  - Los movimientos no se editan ni se borran. Si hay un error, se
 *    registra un movimiento de ajuste opuesto (auditable).
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
import { tenants } from './tenants';
import { users } from './users';
import { clientes } from './clientes';
import { ventas } from './ventas';

export const metodoPagoEnum = pgEnum('metodo_pago', [
  'efectivo',
  'transferencia',
  'tarjeta_debito',
  'tarjeta_credito',
  'mercado_pago',
  'cheque',
  'otro',
]);

export const tipoMovimientoEnum = pgEnum('tipo_movimiento_cc', [
  'venta',          // venta a cuenta corriente → debe
  'pago',           // cliente paga → haber
  'nota_credito',   // devolución / nota de crédito → haber
  'nota_debito',    // intereses / ajuste a favor del negocio → debe
  'ajuste_debe',    // corrección manual → debe
  'ajuste_haber',   // corrección manual → haber
  'saldo_inicial',  // saldo de apertura al cargar el cliente
]);

/**
 * Pagos recibidos. Un pago puede:
 *  - Estar asociado a UNA venta puntual (típico minorista o mayorista contado)
 *  - Estar asociado a un cliente sin venta específica (pago a cuenta corriente)
 *  - No tener cliente (improbable, pero posible para "ingresos varios")
 */
export const pagos = pgTable(
  'pagos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    clienteId: uuid('cliente_id').references(() => clientes.id),
    ventaId: uuid('venta_id').references(() => ventas.id),
    usuarioId: uuid('usuario_id').references(() => users.id),

    fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),
    monto: numeric('monto', { precision: 12, scale: 2 }).notNull(),
    metodo: metodoPagoEnum('metodo').notNull(),

    // Datos del medio de pago (número de cheque, ID de transferencia, etc.)
    referencia: text('referencia'),
    notas: text('notas'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    anuladoAt: timestamp('anulado_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_pagos_tenant').on(t.tenantId),
    index('idx_pagos_tenant_cliente').on(t.tenantId, t.clienteId),
    index('idx_pagos_tenant_venta').on(t.tenantId, t.ventaId),
    index('idx_pagos_tenant_fecha').on(t.tenantId, t.fecha),
  ],
);

/**
 * Movimientos de cuenta corriente — el libro mayor inmutable.
 */
export const movimientosCuentaCorriente = pgTable(
  'movimientos_cuenta_corriente',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => clientes.id, { onDelete: 'cascade' }),

    fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),
    tipo: tipoMovimientoEnum('tipo').notNull(),

    // Referencia a la entidad que originó el movimiento
    ventaId: uuid('venta_id').references(() => ventas.id),
    pagoId: uuid('pago_id').references(() => pagos.id),

    debe: numeric('debe', { precision: 12, scale: 2 }).notNull().default('0'),
    haber: numeric('haber', { precision: 12, scale: 2 }).notNull().default('0'),

    // Saldo del cliente DESPUÉS de aplicar este movimiento (cacheado para reportes rápidos)
    saldoPosterior: numeric('saldo_posterior', { precision: 12, scale: 2 }).notNull(),

    descripcion: text('descripcion').notNull(),
    usuarioId: uuid('usuario_id').references(() => users.id),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_mov_cc_tenant').on(t.tenantId),
    index('idx_mov_cc_tenant_cliente_fecha').on(t.tenantId, t.clienteId, t.fecha),
    index('idx_mov_cc_tenant_venta').on(t.tenantId, t.ventaId),
    index('idx_mov_cc_tenant_pago').on(t.tenantId, t.pagoId),
  ],
);

export type Pago = typeof pagos.$inferSelect;
export type NewPago = typeof pagos.$inferInsert;
export type MovimientoCC = typeof movimientosCuentaCorriente.$inferSelect;
export type NewMovimientoCC = typeof movimientosCuentaCorriente.$inferInsert;
export type MetodoPago = (typeof metodoPagoEnum.enumValues)[number];
export type TipoMovimiento = (typeof tipoMovimientoEnum.enumValues)[number];
