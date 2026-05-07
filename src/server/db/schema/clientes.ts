/**
 * Clientes — quienes compran al negocio.
 *
 * Tipos de cliente:
 *  - mayorista: otro negocio, generalmente con cuenta corriente, factura A/B
 *  - minorista: cliente individual del barrio, paga al toque, ticket
 *  - ambos: cliente que a veces compra mayorista y a veces minorista
 *
 * Consumidor Final:
 *  Cada tenant tiene UN cliente especial con `esConsumidorFinal = true`,
 *  creado automáticamente al dar de alta el tenant. Las ventas minoristas
 *  walk-in (sin cliente registrado) se atribuyen ahí.
 *
 * Cuenta corriente:
 *  Solo aplica a clientes con `habilitaCuentaCorriente = true`. El campo
 *  `saldoActual` se mantiene cacheado por las server actions que registran
 *  movimientos. Convención: saldo positivo = el cliente DEBE al negocio.
 */
import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const tipoClienteEnum = pgEnum('tipo_cliente', [
  'mayorista',
  'minorista',
  'ambos',
]);

export const condicionIvaEnum = pgEnum('condicion_iva', [
  'responsable_inscripto',
  'monotributo',
  'consumidor_final',
  'exento',
  'no_categorizado',
]);

export const clientes = pgTable(
  'clientes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Tipo y rol especial
    tipo: tipoClienteEnum('tipo').notNull().default('minorista'),
    esConsumidorFinal: boolean('es_consumidor_final').notNull().default(false),

    // Datos identificatorios
    razonSocial: text('razon_social').notNull(),
    nombreFantasia: text('nombre_fantasia'),
    cuit: text('cuit'),
    condicionIva: condicionIvaEnum('condicion_iva').notNull().default('consumidor_final'),

    // Contacto
    email: text('email'),
    telefono: text('telefono'),

    // Dirección
    direccion: text('direccion'),
    localidad: text('localidad'),
    provincia: text('provincia'),
    codigoPostal: text('codigo_postal'),

    // Cuenta corriente
    habilitaCuentaCorriente: boolean('habilita_cuenta_corriente').notNull().default(false),
    limiteCredito: numeric('limite_credito', { precision: 12, scale: 2 }), // null = sin límite
    saldoActual: numeric('saldo_actual', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    diaPago: text('dia_pago'),                       // ej: "viernes", "fin de mes" — texto libre

    // Comerciales
    descuentoPorcentaje: numeric('descuento_porcentaje', { precision: 5, scale: 2 }),
    // ↑ % de descuento sobre el precio del canal del cliente. Null = precio normal.

    notas: text('notas'),

    // Estado
    activo: boolean('activo').notNull().default(true),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_clientes_tenant').on(t.tenantId),
    index('idx_clientes_tenant_activo').on(t.tenantId, t.activo),
    index('idx_clientes_tenant_tipo').on(t.tenantId, t.tipo),
    // Solo puede haber UN consumidor final por tenant
    uniqueIndex('uniq_consumidor_final_por_tenant')
      .on(t.tenantId)
      .where(sql`es_consumidor_final = true`),
  ],
);

export type Cliente = typeof clientes.$inferSelect;
export type NewCliente = typeof clientes.$inferInsert;
export type TipoCliente = (typeof tipoClienteEnum.enumValues)[number];
export type CondicionIva = (typeof condicionIvaEnum.enumValues)[number];
