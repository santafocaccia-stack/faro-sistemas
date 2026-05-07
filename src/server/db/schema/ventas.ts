/**
 * Ventas — registro de toda venta realizada (mayorista o minorista).
 *
 * Estructura: header (ventas) + detalle (ventasLineas).
 *
 * Canal:
 *  - mayorista: venta a otro negocio, normalmente cuenta corriente, factura A/B/C
 *  - minorista: venta al consumidor final por mostrador, ticket no fiscal o B
 *
 * Tipo de pago:
 *  - contado: se paga al momento (efectivo, tarjeta, transferencia)
 *  - cuenta_corriente: se anota en la cuenta corriente del cliente
 *
 * Estados:
 *  - pendiente: venta cargada pero aún no pagada (típica en cuenta corriente)
 *  - parcial: pagada parcialmente
 *  - pagada: cancelada totalmente
 *  - anulada: anulada (queda registro pero no impacta saldos)
 *
 * Numeración:
 *  - `numero` es secuencial por tenant + canal (cada canal tiene su contador).
 *  - Se asigna en la server action que crea la venta, dentro de la transacción.
 *
 * AFIP:
 *  - facturaTipo, facturaNumero, cae se llenan cuando se factura electrónicamente.
 *  - Una venta puede existir SIN factura electrónica (ticket interno).
 */
import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';
import { clientes } from './clientes';
import { productos } from './productos';

export const canalVentaEnum = pgEnum('canal_venta', ['mayorista', 'minorista']);
export const tipoPagoEnum = pgEnum('tipo_pago_venta', ['contado', 'cuenta_corriente']);
export const estadoVentaEnum = pgEnum('estado_venta', [
  'pendiente',
  'parcial',
  'pagada',
  'anulada',
]);
export const tipoFacturaEnum = pgEnum('tipo_factura_afip', [
  'A',
  'B',
  'C',
  'M',
  'T',  // ticket no fiscal
]);

export const ventas = pgTable(
  'ventas',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Numeración
    numero: integer('numero').notNull(),  // secuencial por tenant+canal
    canal: canalVentaEnum('canal').notNull(),

    // Quién y cuándo
    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => clientes.id),
    usuarioId: uuid('usuario_id')
      .references(() => users.id),
    fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),

    // Pago
    tipoPago: tipoPagoEnum('tipo_pago').notNull().default('contado'),
    estado: estadoVentaEnum('estado').notNull().default('pendiente'),

    // Montos
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
    descuento: numeric('descuento', { precision: 12, scale: 2 }).notNull().default('0'),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
    montoPagado: numeric('monto_pagado', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),

    // Facturación AFIP (opcional — solo si se emitió factura electrónica)
    facturaTipo: tipoFacturaEnum('factura_tipo'),
    facturaPuntoVenta: integer('factura_punto_venta'),
    facturaNumero: integer('factura_numero'),
    cae: text('cae'),
    caeVencimiento: timestamp('cae_vencimiento', { withTimezone: true }),

    notas: text('notas'),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    anuladaAt: timestamp('anulada_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_ventas_tenant').on(t.tenantId),
    index('idx_ventas_tenant_canal_numero').on(t.tenantId, t.canal, t.numero),
    index('idx_ventas_tenant_cliente').on(t.tenantId, t.clienteId),
    index('idx_ventas_tenant_fecha').on(t.tenantId, t.fecha),
    index('idx_ventas_tenant_estado').on(t.tenantId, t.estado),
  ],
);

/**
 * Líneas de venta — un renglón por producto vendido.
 *
 * Precio congelado:
 *   `precioUnitario` se guarda al momento de la venta y NO cambia, aunque
 *   después se modifique el precio del producto. Es histórico.
 *
 * Cantidad:
 *   En kg para productos por_kg (precision 12, scale 3 → hasta 999.999,999 kg).
 *   En unidades enteras para productos por_unidad (se usa el mismo campo
 *   numeric pero la app valida que sea entero).
 */
export const ventasLineas = pgTable(
  'ventas_lineas',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    ventaId: uuid('venta_id')
      .notNull()
      .references(() => ventas.id, { onDelete: 'cascade' }),
    productoId: uuid('producto_id')
      .references(() => productos.id),
    // ↑ nullable: permite líneas "libres" sin producto asociado

    // Descripción libre (cuando no hay productoId, o para anotar variantes)
    descripcion: text('descripcion').notNull(),

    cantidad: numeric('cantidad', { precision: 12, scale: 3 }).notNull(),
    precioUnitario: numeric('precio_unitario', { precision: 12, scale: 2 }).notNull(),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_ventas_lineas_venta').on(t.ventaId),
    index('idx_ventas_lineas_tenant_producto').on(t.tenantId, t.productoId),
  ],
);

export type Venta = typeof ventas.$inferSelect;
export type NewVenta = typeof ventas.$inferInsert;
export type VentaLinea = typeof ventasLineas.$inferSelect;
export type NewVentaLinea = typeof ventasLineas.$inferInsert;
export type CanalVenta = (typeof canalVentaEnum.enumValues)[number];
export type TipoPago = (typeof tipoPagoEnum.enumValues)[number];
export type EstadoVenta = (typeof estadoVentaEnum.enumValues)[number];
export type TipoFactura = (typeof tipoFacturaEnum.enumValues)[number];
