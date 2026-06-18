/**
 * Pedidos Atmosféricos — órdenes de servicio a domicilio para el plan 'atmosfericos'.
 *
 * Cada pedido representa un servicio (vaciado de pozo, etc.) a realizar en
 * una dirección. El jefe define el orden de la ruta; el empleado ve la lista
 * en ese orden y completa cada parada registrando litros y monto cobrado.
 *
 * Real-time: los cambios en `orden` se replican via Supabase Realtime.
 */
import {
  pgTable, uuid, text, numeric, integer, boolean,
  timestamp, date, pgEnum, index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';
import { clientes } from './clientes';

export const estadoPedidoAtmos = pgEnum('estado_pedido_atmos', [
  'pendiente',   // en lista, no visitado aún
  'en_camino',   // el empleado está yendo
  'completado',  // servicio realizado
  'cancelado',   // cancelado (no se fue)
]);

export const pedidosAtmosfericos = pgTable(
  'pedidos_atmosfericos',
  {
    id:       uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),

    // Cliente (opcional — puede ser un pedido ad-hoc sin cliente registrado)
    clienteId: uuid('cliente_id').references(() => clientes.id, { onDelete: 'set null' }),

    // Datos del punto de servicio (se pre-llenan desde el cliente si existe)
    nombreContacto: text('nombre_contacto'),   // nombre de quien atiende en la casa
    direccion:      text('direccion').notNull(),
    localidad:      text('localidad'),
    referencias:    text('referencias'),       // "casa amarilla, portón verde"

    // Orden en la ruta del día (el jefe lo define, 0-based)
    orden: integer('orden').notNull().default(0),

    // Estado del pedido
    estado: estadoPedidoAtmos('estado').notNull().default('pendiente'),

    // Programación
    fechaProgramada: date('fecha_programada').notNull(),

    // Datos del servicio (se completan al terminar)
    litrosPozo:    numeric('litros_pozo', { precision: 10, scale: 2 }),  // capacidad del pozo (se guarda en cliente también)
    litrosExtraidos: numeric('litros_extraidos', { precision: 10, scale: 2 }), // lo que realmente se extrajo
    montoCobrado:  numeric('monto_cobrado', { precision: 12, scale: 2 }),
    metodoPago:    text('metodo_pago'),  // 'efectivo' | 'transferencia' | 'otro'
    notas:         text('notas'),

    // Seguimiento
    asignadoA: uuid('asignado_a').references(() => users.id, { onDelete: 'set null' }),
    completadoAt: timestamp('completado_at', { withTimezone: true }),

    // Soft-delete
    activo: boolean('activo').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('idx_pedidos_atmos_tenant').on(t.tenantId),
    index('idx_pedidos_atmos_fecha').on(t.tenantId, t.fechaProgramada),
    index('idx_pedidos_atmos_estado').on(t.tenantId, t.estado),
    index('idx_pedidos_atmos_orden').on(t.tenantId, t.fechaProgramada, t.orden),
    index('idx_pedidos_atmos_cliente').on(t.clienteId),
  ],
);

export type PedidoAtmosfera = typeof pedidosAtmosfericos.$inferSelect;
export type NuevoPedidoAtmosfera = typeof pedidosAtmosfericos.$inferInsert;
export type EstadoPedidoAtmos = (typeof estadoPedidoAtmos.enumValues)[number];
