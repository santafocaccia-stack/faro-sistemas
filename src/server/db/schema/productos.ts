/**
 * Productos — catálogo de cortes y mercaderías del negocio.
 *
 * Tipos de unidad:
 *  - por_kg: la cantidad y el precio se manejan por kilogramo
 *           (ej: bola de lomo, asado de tira). Stock en kg.
 *  - por_unidad: se vende por pieza entera
 *           (ej: pollo entero, chorizo, huevo). Stock en unidades.
 *
 * Precios:
 *  - precioMayorista y precioMinorista están "embedded" en el producto
 *    para queries rápidos. Son los precios actuales vigentes.
 *  - Si en el futuro hace falta historial de precios o lista por cliente,
 *    se agrega tabla `precios` aparte. Por ahora YAGNI.
 */
import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { categorias, gruposVariantes } from './categorias';

export const tipoUnidadEnum = pgEnum('tipo_unidad', ['por_kg', 'por_unidad']);

export const productos = pgTable(
  'productos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Identificación
    codigo: text('codigo'),
    codigoPlu: text('codigo_plu'),     // código PLU para balanza (4 dígitos)
    nombre: text('nombre').notNull(),
    descripcion: text('descripcion'),
    categoriaId: uuid('categoria_id').references(() => categorias.id, { onDelete: 'set null' }),
    grupoVarianteId: uuid('grupo_variante_id').references(() => gruposVariantes.id, { onDelete: 'set null' }),

    // Tipo de unidad y stock
    tipoUnidad: tipoUnidadEnum('tipo_unidad').notNull().default('por_kg'),
    stockActual: numeric('stock_actual', { precision: 12, scale: 3 })
      .notNull()
      .default('0'),
    stockMinimo: numeric('stock_minimo', { precision: 12, scale: 3 }), // alerta de stock bajo

    // Costo y precios actuales
    costoPromedio: numeric('costo_promedio', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    precioMayorista: numeric('precio_mayorista', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    precioMinorista: numeric('precio_minorista', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),

    // Recargo % objetivo sobre el costo (override del default del negocio). Nullable = usar el del negocio.
    margenObjetivo: numeric('margen_objetivo', { precision: 5, scale: 2 }),

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
    // Multi-tenant: TODA query parte de tenant_id
    index('idx_productos_tenant').on(t.tenantId),
    index('idx_productos_tenant_activo').on(t.tenantId, t.activo),
    index('idx_productos_tenant_codigo').on(t.tenantId, t.codigo),
  ],
);

export type Producto = typeof productos.$inferSelect;
export type NewProducto = typeof productos.$inferInsert;
export type TipoUnidad = (typeof tipoUnidadEnum.enumValues)[number];
