/**
 * Préstamos (plan "prestamista") — gestión de cartera de créditos.
 *
 * Flujo: deudor (reusa clientes) → préstamo → cronograma de cuotas → pagos.
 *
 * Al crear el préstamo se genera el cronograma completo (tabla de amortización)
 * en `cuotas`. Cada cuota guarda su desglose capital/interés y el saldo posterior
 * (mismo patrón inmutable que la cuenta corriente de ventas).
 *
 * Los pagos se registran en `pagos_prestamo` con imputación desglosada
 * (mora → interés → capital). La mora punitoria se devenga sobre cuotas
 * vencidas y se calcula on-read en el MVP.
 *
 * Todo filtra por tenant_id (helper byTenant). Montos en numeric(12,2),
 * tasas en numeric(7,4) (admite hasta 999.9999 % anual, realista en AR).
 */
import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  timestamp,
  date,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { clientes } from './clientes';
import { users } from './users';
import { metodoPagoEnum } from './cuenta-corriente';

export const sistemaAmortizacionEnum = pgEnum('sistema_amortizacion', [
  'frances', // cuota constante (default)
  'aleman', // amortización de capital constante, cuota decreciente
  'americano', // solo interés periódico, capital al final
]);

export const frecuenciaPagoEnum = pgEnum('frecuencia_pago', [
  'diaria',
  'semanal',
  'quincenal',
  'mensual',
]);

export const estadoPrestamoEnum = pgEnum('estado_prestamo', [
  'vigente',
  'en_mora',
  'cancelado',
  'refinanciado',
  'incobrable',
]);

export const estadoCuotaEnum = pgEnum('estado_cuota', [
  'pendiente',
  'parcial',
  'pagada',
  'vencida',
]);

// ─── Préstamos ───────────────────────────────────────────────────────────────
export const prestamos = pgTable(
  'prestamos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => clientes.id, { onDelete: 'restrict' }), // el deudor

    estado: estadoPrestamoEnum('estado').notNull().default('vigente'),
    sistema: sistemaAmortizacionEnum('sistema').notNull().default('frances'),

    capital: numeric('capital', { precision: 12, scale: 2 }).notNull(),
    tasaNominalAnual: numeric('tasa_nominal_anual', { precision: 7, scale: 4 }).notNull(),
    frecuencia: frecuenciaPagoEnum('frecuencia').notNull().default('mensual'),
    cantidadCuotas: integer('cantidad_cuotas').notNull(),

    fechaOtorgamiento: date('fecha_otorgamiento').notNull(),
    fechaPrimerVencimiento: date('fecha_primer_vencimiento').notNull(),

    // Mora
    tasaPunitoriaAnual: numeric('tasa_punitoria_anual', { precision: 7, scale: 4 }),
    diasGracia: integer('dias_gracia').notNull().default(0),

    notas: text('notas'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_prestamos_tenant').on(t.tenantId),
    index('idx_prestamos_tenant_estado').on(t.tenantId, t.estado),
    index('idx_prestamos_tenant_cliente').on(t.tenantId, t.clienteId),
  ],
);

// ─── Cuotas (cronograma de amortización) ─────────────────────────────────────
export const cuotas = pgTable(
  'cuotas',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    prestamoId: uuid('prestamo_id')
      .notNull()
      .references(() => prestamos.id, { onDelete: 'cascade' }),

    numero: integer('numero').notNull(), // 1..N
    vencimiento: date('vencimiento').notNull(),

    montoCuota: numeric('monto_cuota', { precision: 12, scale: 2 }).notNull(),
    capital: numeric('capital', { precision: 12, scale: 2 }).notNull(),
    interes: numeric('interes', { precision: 12, scale: 2 }).notNull(),
    saldoPosterior: numeric('saldo_posterior', { precision: 12, scale: 2 }).notNull(),

    estado: estadoCuotaEnum('estado').notNull().default('pendiente'),
    montoPagado: numeric('monto_pagado', { precision: 12, scale: 2 }).notNull().default('0'),
    moraAcumulada: numeric('mora_acumulada', { precision: 12, scale: 2 }).notNull().default('0'),
    pagadaAt: timestamp('pagada_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uniq_cuota_prestamo_numero').on(t.prestamoId, t.numero),
    index('idx_cuotas_tenant').on(t.tenantId),
    index('idx_cuotas_tenant_vencimiento').on(t.tenantId, t.vencimiento),
    index('idx_cuotas_prestamo').on(t.prestamoId),
  ],
);

// ─── Pagos de préstamo (con imputación desglosada) ───────────────────────────
export const pagosPrestamo = pgTable(
  'pagos_prestamo',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    prestamoId: uuid('prestamo_id')
      .notNull()
      .references(() => prestamos.id, { onDelete: 'cascade' }),
    clienteId: uuid('cliente_id').references(() => clientes.id, { onDelete: 'set null' }),
    usuarioId: uuid('usuario_id').references(() => users.id, { onDelete: 'set null' }),

    fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),
    montoTotal: numeric('monto_total', { precision: 12, scale: 2 }).notNull(),

    // Imputación
    aMora: numeric('a_mora', { precision: 12, scale: 2 }).notNull().default('0'),
    aInteres: numeric('a_interes', { precision: 12, scale: 2 }).notNull().default('0'),
    aCapital: numeric('a_capital', { precision: 12, scale: 2 }).notNull().default('0'),

    metodo: metodoPagoEnum('metodo').notNull().default('efectivo'),
    referencia: text('referencia'),
    anuladoAt: timestamp('anulado_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_pagos_prestamo_tenant').on(t.tenantId),
    index('idx_pagos_prestamo_prestamo').on(t.prestamoId),
  ],
);

export type Prestamo = typeof prestamos.$inferSelect;
export type NewPrestamo = typeof prestamos.$inferInsert;
export type EstadoPrestamo = (typeof estadoPrestamoEnum.enumValues)[number];
export type SistemaAmortizacion = (typeof sistemaAmortizacionEnum.enumValues)[number];
export type FrecuenciaPago = (typeof frecuenciaPagoEnum.enumValues)[number];
export type Cuota = typeof cuotas.$inferSelect;
export type NewCuota = typeof cuotas.$inferInsert;
export type EstadoCuota = (typeof estadoCuotaEnum.enumValues)[number];
export type PagoPrestamo = typeof pagosPrestamo.$inferSelect;
