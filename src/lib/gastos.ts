import type { PlanId } from './planes';

/**
 * Categorías de gasto SUGERIDAS por plan. No son un enum cerrado: el usuario
 * puede escribir una categoría libre. Sirven para autocompletar y para que el
 * análisis mensual agrupe los egresos de forma reconocible por rubro.
 *
 * "Otros" va siempre al final como cajón de sastre.
 */
export const CATEGORIAS_GASTO_POR_PLAN: Record<PlanId, readonly string[]> = {
  atmosfericos: ['Gasoil', 'Aceite', 'Comida', 'Descarga', 'Mantenimiento', 'Repuestos', 'Empleados', 'Seguro', 'Patente', 'Otros'],
  market:       ['Costo de mercadería', 'Empleados', 'Luz', 'Agua', 'Alquiler', 'Internet', 'Impuestos', 'Limpieza', 'Fletes', 'Otros'],
  food:         ['Insumos', 'Empleados', 'Luz', 'Gas', 'Alquiler', 'Delivery', 'Descartables', 'Impuestos', 'Limpieza', 'Otros'],
  balanza:      ['Mercadería', 'Empleados', 'Luz', 'Alquiler', 'Fletes', 'Bolsas/Envases', 'Impuestos', 'Mantenimiento', 'Otros'],
  servicios:    ['Materiales', 'Herramientas', 'Combustible', 'Transporte', 'Empleados', 'Impuestos', 'Seguro', 'Otros'],
  prestamista:  ['Empleados', 'Oficina', 'Servicios', 'Impuestos', 'Comisiones', 'Incobrables', 'Otros'],
};

/** Categorías sugeridas para un plan (con fallback a market si no se reconoce). */
export function categoriasGasto(plan?: string | null): readonly string[] {
  return CATEGORIAS_GASTO_POR_PLAN[(plan ?? 'market') as PlanId] ?? CATEGORIAS_GASTO_POR_PLAN.market;
}

/**
 * Etiqueta del ingreso según el plan (para mostrar en el balance).
 * Coincide con la fuente de ingreso que usa el balance mensual.
 */
export function etiquetaIngresoPlan(plan: PlanId): string {
  if (plan === 'prestamista') return 'Cobranzas';
  if (plan === 'servicios') return 'Cobros';
  if (plan === 'atmosfericos') return 'Cobros de pedidos';
  return 'Ventas';
}
