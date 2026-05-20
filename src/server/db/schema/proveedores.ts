import {
  pgTable, pgEnum, uuid, text, numeric, boolean, timestamp, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { productos } from './productos';

export const proveedores = pgTable(
  'proveedores',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    nombre: text('nombre').notNull(),
    contacto: text('contacto'),
    // Teléfono en formato internacional (dígitos con código de país, ej: 5491112345678)
    // Listo para armar links de WhatsApp.
    telefono: text('telefono'),

    // Días de la semana para pedir: ['lunes', 'miercoles', ...]
    diasPedido: text('dias_pedido').array().notNull().default(sql`ARRAY[]::text[]`),

    // Markup por defecto para calcular precio sugerido al registrar costo
    markupMayorista: numeric('markup_mayorista', { precision: 6, scale: 2 }).notNull().default('0'),
    markupMinorista: numeric('markup_minorista', { precision: 6, scale: 2 }).notNull().default('0'),

    activo: boolean('activo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_proveedores_tenant').on(t.tenantId)],
);

export const productoProveedores = pgTable(
  'producto_proveedores',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    productoId: uuid('producto_id')
      .notNull()
      .references(() => productos.id, { onDelete: 'cascade' }),
    proveedorId: uuid('proveedor_id')
      .notNull()
      .references(() => proveedores.id, { onDelete: 'cascade' }),

    precioCosto: numeric('precio_costo', { precision: 12, scale: 2 }).notNull().default('0'),

    // null = usar el markup del proveedor
    markupMayorista: numeric('markup_mayorista', { precision: 6, scale: 2 }),
    markupMinorista: numeric('markup_minorista', { precision: 6, scale: 2 }),

    // El proveedor principal es el que acumula el carrito de pedidos
    esPrincipal: boolean('es_principal').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_prod_prov_tenant').on(t.tenantId),
    index('idx_prod_prov_producto').on(t.productoId),
    index('idx_prod_prov_proveedor').on(t.proveedorId),
  ],
);

export const estadoPedidoEnum = pgEnum('estado_pedido', ['borrador', 'enviado', 'recibido']);

export const pedidosProveedores = pgTable(
  'pedidos_proveedores',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    proveedorId: uuid('proveedor_id')
      .notNull()
      .references(() => proveedores.id),

    estado: estadoPedidoEnum('estado').notNull().default('borrador'),
    notas: text('notas'),

    enviadoAt: timestamp('enviado_at', { withTimezone: true }),
    recibidoAt: timestamp('recibido_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_pedidos_prov_tenant').on(t.tenantId),
    index('idx_pedidos_prov_proveedor').on(t.proveedorId),
    index('idx_pedidos_prov_estado').on(t.tenantId, t.estado),
  ],
);

export const pedidosLineas = pgTable(
  'pedidos_lineas',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    pedidoId: uuid('pedido_id')
      .notNull()
      .references(() => pedidosProveedores.id, { onDelete: 'cascade' }),
    productoId: uuid('producto_id')
      .notNull()
      .references(() => productos.id),

    cantidadPedida: numeric('cantidad_pedida', { precision: 12, scale: 3 }).notNull().default('0'),
    cantidadRecibida: numeric('cantidad_recibida', { precision: 12, scale: 3 }),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_pedidos_lineas_tenant').on(t.tenantId),
    index('idx_pedidos_lineas_pedido').on(t.pedidoId),
    index('idx_pedidos_lineas_producto').on(t.productoId),
  ],
);

export type Proveedor = typeof proveedores.$inferSelect;
export type ProductoProveedor = typeof productoProveedores.$inferSelect;
export type PedidoProveedor = typeof pedidosProveedores.$inferSelect;
export type PedidoLinea = typeof pedidosLineas.$inferSelect;
export type EstadoPedido = (typeof estadoPedidoEnum.enumValues)[number];
