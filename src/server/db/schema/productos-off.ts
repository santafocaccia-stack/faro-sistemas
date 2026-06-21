import { pgTable, text } from 'drizzle-orm/pg-core';

export const productosOff = pgTable('productos_off', {
  codigoBarras: text('codigo_barras').primaryKey(),
  nombreProducto: text('nombre_producto').notNull(),
});
