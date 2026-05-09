import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  pgEnum,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { clientes } from './clientes';
import { productos } from './productos';

export const presupuestoEstadoEnum = pgEnum('presupuesto_estado', [
  'borrador',
  'enviado',
  'aprobado',
  'rechazado',
  'vencido',
]);

export const presupuestos = pgTable(
  'presupuestos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    numero: integer('numero').notNull(),

    // Cliente: puede ser registrado o texto libre
    clienteId: uuid('cliente_id').references(() => clientes.id, { onDelete: 'set null' }),
    clienteNombre: text('cliente_nombre'), // fallback si no hay cliente en DB

    // Fechas
    fecha:       timestamp('fecha',        { withTimezone: true }).notNull().defaultNow(),
    validezDias: integer('validez_dias').notNull().default(15),

    // Estado
    estado: presupuestoEstadoEnum('estado').notNull().default('borrador'),

    // Contenido
    notas: text('notas'),

    // Totales calculados
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
    descuento: numeric('descuento', { precision: 12, scale: 2 }).notNull().default('0'),
    total:    numeric('total',    { precision: 12, scale: 2 }).notNull().default('0'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('idx_presupuestos_tenant').on(t.tenantId),
    index('idx_presupuestos_tenant_estado').on(t.tenantId, t.estado),
  ],
);

export const presupuestosLineas = pgTable('presupuestos_lineas', {
  id: uuid('id').defaultRandom().primaryKey(),
  presupuestoId: uuid('presupuesto_id')
    .notNull()
    .references(() => presupuestos.id, { onDelete: 'cascade' }),
  productoId: uuid('producto_id').references(() => productos.id, { onDelete: 'set null' }),

  descripcion:    text('descripcion').notNull(),
  cantidad:       numeric('cantidad',        { precision: 12, scale: 3 }).notNull(),
  precioUnitario: numeric('precio_unitario', { precision: 12, scale: 2 }).notNull(),
  subtotal:       numeric('subtotal',        { precision: 12, scale: 2 }).notNull(),
});

export type Presupuesto      = typeof presupuestos.$inferSelect;
export type NewPresupuesto   = typeof presupuestos.$inferInsert;
export type PresupuestoLinea = typeof presupuestosLineas.$inferSelect;
export type PresupuestoEstado = (typeof presupuestoEstadoEnum.enumValues)[number];
