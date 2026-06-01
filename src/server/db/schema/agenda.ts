/**
 * Agenda (plan "servicios") — turnos y vencimientos del prestador independiente.
 *
 * Dos módulos independientes:
 *  - turnos: agenda semanal de trabajos/citas (con cliente, dirección, estado).
 *  - vencimientos: compromisos recurrentes (monotributo, VTV, seguros, matrícula)
 *    con aviso anticipado. Cada vencimiento genera "ocurrencias" (historial de
 *    cumplimiento); al marcar una como pagada se avanza el próximo vencimiento
 *    según la periodicidad.
 *
 * Todo filtra por tenant_id (helper byTenant). Soft-delete con deletedAt.
 */
import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  integer,
  timestamp,
  date,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { clientes } from './clientes';

// ─── Turnos ──────────────────────────────────────────────────────────────────
export const estadoTurnoEnum = pgEnum('estado_turno', [
  'agendado',
  'confirmado',
  'en_curso',
  'completado',
  'cancelado',
  'no_asistio',
]);

export const turnos = pgTable(
  'turnos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Cliente del trabajo (opcional: puede ser un prospecto sin alta)
    clienteId: uuid('cliente_id').references(() => clientes.id, {
      onDelete: 'set null',
    }),

    estado: estadoTurnoEnum('estado').notNull().default('agendado'),

    // Qué y dónde
    titulo: text('titulo').notNull(), // ej: "Cambio de termotanque"
    descripcion: text('descripcion'),
    direccion: text('direccion'), // dónde se hace el trabajo (no la del cliente)
    localidad: text('localidad'),

    // Cuándo
    inicio: timestamp('inicio', { withTimezone: true }).notNull(),
    duracionMin: integer('duracion_min').notNull().default(60),

    // Previsión de ingreso (opcional)
    montoEstimado: numeric('monto_estimado', { precision: 12, scale: 2 }),

    // Links opcionales a cotización / venta (sin FK estricta para no acoplar)
    presupuestoId: uuid('presupuesto_id'),
    ventaId: uuid('venta_id'),

    notas: text('notas'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_turnos_tenant').on(t.tenantId),
    index('idx_turnos_tenant_inicio').on(t.tenantId, t.inicio), // vista semanal
    index('idx_turnos_tenant_estado').on(t.tenantId, t.estado),
    index('idx_turnos_tenant_cliente').on(t.tenantId, t.clienteId),
  ],
);

// ─── Vencimientos ────────────────────────────────────────────────────────────
export const tipoVencimientoEnum = pgEnum('tipo_vencimiento', [
  'monotributo_afip',
  'iva',
  'ganancias',
  'vtv',
  'seguro_rc',
  'seguro_auto',
  'art',
  'matricula',
  'habilitacion',
  'certificacion',
  'herramienta',
  'otro',
]);

export const periodicidadEnum = pgEnum('periodicidad_vencimiento', [
  'unico',
  'mensual',
  'bimestral',
  'trimestral',
  'semestral',
  'anual',
]);

export const vencimientos = pgTable(
  'vencimientos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    tipo: tipoVencimientoEnum('tipo').notNull().default('otro'),
    titulo: text('titulo').notNull(), // ej: "VTV camioneta AB123CD"

    proximoVencimiento: date('proximo_vencimiento').notNull(),
    periodicidad: periodicidadEnum('periodicidad').notNull().default('anual'),
    diasAvisoAnticipado: integer('dias_aviso_anticipado').notNull().default(7),

    montoEstimado: numeric('monto_estimado', { precision: 12, scale: 2 }),
    activo: boolean('activo').notNull().default(true),
    notas: text('notas'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_venc_tenant').on(t.tenantId),
    index('idx_venc_tenant_proximo').on(t.tenantId, t.proximoVencimiento), // "qué vence pronto"
    index('idx_venc_tenant_activo').on(t.tenantId, t.activo),
  ],
);

export const estadoOcurrenciaEnum = pgEnum('estado_ocurrencia', [
  'pendiente',
  'pagado',
  'vencido',
  'omitido',
]);

export const vencimientosOcurrencias = pgTable(
  'vencimientos_ocurrencias',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    vencimientoId: uuid('vencimiento_id')
      .notNull()
      .references(() => vencimientos.id, { onDelete: 'cascade' }),

    vence: date('vence').notNull(),
    estado: estadoOcurrenciaEnum('estado').notNull().default('pendiente'),
    pagadoAt: timestamp('pagado_at', { withTimezone: true }),
    montoPagado: numeric('monto_pagado', { precision: 12, scale: 2 }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_venc_oc_tenant').on(t.tenantId),
    index('idx_venc_oc_venc').on(t.vencimientoId),
  ],
);

export type Turno = typeof turnos.$inferSelect;
export type NewTurno = typeof turnos.$inferInsert;
export type EstadoTurno = (typeof estadoTurnoEnum.enumValues)[number];
export type Vencimiento = typeof vencimientos.$inferSelect;
export type NewVencimiento = typeof vencimientos.$inferInsert;
export type TipoVencimiento = (typeof tipoVencimientoEnum.enumValues)[number];
export type Periodicidad = (typeof periodicidadEnum.enumValues)[number];
export type VencimientoOcurrencia = typeof vencimientosOcurrencias.$inferSelect;
