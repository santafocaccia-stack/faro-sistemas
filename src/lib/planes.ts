export type PlanId = 'servicios' | 'market' | 'food' | 'balanza' | 'prestamista' | 'atmosfericos';

export const PLANES = {
  atmosfericos: {
    id: 'atmosfericos' as PlanId,
    nombre: 'Gesto Atmosféricos',
    precioUsd: 20,
    descripcion: 'Para empresas de servicio de pozos y atmosféricos a domicilio',
    features: [
      'Lista de pedidos del día con ruta',
      'Historial por cliente (litros y cobros)',
      'Ruta optimizada en Google Maps',
      'Actualización en tiempo real para el equipo',
    ],
    color: 'oklch(0.60 0.18 200)',
    proximamente: false,
  },
  servicios: {
    id: 'servicios' as PlanId,
    nombre: 'Gesto Servicios',
    precioUsd: 15,
    descripcion: 'Para trabajadores independientes y prestadores de servicios',
    features: [
      'Crear y enviar presupuestos en PDF',
      'Seguimiento de clientes',
      'Historial de cobros',
      'Reportes básicos',
    ],
    color: 'oklch(0.65 0.15 250)',
    proximamente: false,
  },
  market: {
    id: 'market' as PlanId,
    nombre: 'Gesto Market',
    precioUsd: 24,
    descripcion: 'Para kioscos, ferreterías y comercios generales',
    features: [
      'POS con código de barras',
      'Stock en tiempo real',
      'Precios mayorista y minorista',
      'Cuenta corriente de clientes',
      'Reportes de ventas',
    ],
    color: 'oklch(0.68 0.19 38)',
    proximamente: false,
  },
  food: {
    id: 'food' as PlanId,
    nombre: 'Gesto Food',
    precioUsd: 40,
    descripcion: 'Para hamburgueserías, pizzerías y gastronomía',
    features: [
      'Todo lo de Market',
      'Modificadores por ítem (extras, opciones)',
      'Pantalla de cocina (KDS)',
      'Gestión de mesas y turnos',
    ],
    color: 'oklch(0.65 0.18 145)',
    proximamente: true,
  },
  balanza: {
    id: 'balanza' as PlanId,
    nombre: 'Gesto Balanza',
    precioUsd: 32,
    descripcion: 'Para carnicerías, verdulerías y venta por peso',
    features: [
      'Todo lo de Market',
      'Venta por kilogramo (peso a mano o con atajos)',
      'Lee etiquetas de balanza por PLU',
      'Categorías y grupos de variantes',
    ],
    color: 'oklch(0.62 0.16 320)',
    proximamente: false,
  },
  prestamista: {
    id: 'prestamista' as PlanId,
    nombre: 'Gesto Préstamos',
    precioUsd: 28,
    descripcion: 'Para prestamistas y financieras: gestión de créditos y cobranzas',
    features: [
      'Deudores y préstamos en un solo lugar',
      'Cronograma de cuotas automático (sistema francés)',
      'Registro de pagos con cálculo de mora',
      'Cartera: total prestado, a cobrar y en mora',
    ],
    color: 'oklch(0.6 0.15 160)',
    proximamente: false,
  },
} as const;

export const PLANES_ARRAY = Object.values(PLANES);

/* ─────────────────────────────────────────────────────────────
   Capacidades por plan — FUENTE DE VERDAD de qué puede hacer
   cada plan. Tanto la navegación (qué se muestra) como el guard
   de rutas server-side (qué se puede abrir) derivan de acá.

   Regla: cada plan tiene exactamente lo que necesita y nada más.
───────────────────────────────────────────────────────────── */
export type Capacidad =
  | 'pos' // punto de venta + lector de códigos de barras
  | 'productos' // inventario / stock
  | 'presupuestos' // presupuestos en PDF (+ cobro de servicios)
  | 'agenda' // agenda de turnos + vencimientos
  | 'prestamos' // cartera de créditos
  | 'clientes'
  | 'cuentaCorriente'
  | 'compras' // proveedores + pedidos
  | 'reportes'
  | 'gastos' // registro de egresos + balance mensual con análisis IA
  | 'cocina' // pantalla de cocina (KDS)
  | 'balanza' // integración con balanza digital
  | 'atmosfericos'; // gestión de pedidos de servicio a domicilio (pozos, etc.)

export const CAPACIDADES_POR_PLAN: Record<PlanId, readonly Capacidad[]> = {
  servicios:    ['presupuestos', 'agenda', 'clientes', 'cuentaCorriente', 'reportes', 'gastos'],
  market:       ['pos', 'productos', 'clientes', 'cuentaCorriente', 'compras', 'reportes', 'gastos'],
  food:         ['pos', 'productos', 'clientes', 'cuentaCorriente', 'compras', 'reportes', 'cocina', 'gastos'],
  balanza:      ['pos', 'productos', 'clientes', 'cuentaCorriente', 'compras', 'reportes', 'balanza', 'gastos'],
  prestamista:  ['prestamos', 'clientes', 'gastos'],
  atmosfericos: ['atmosfericos', 'clientes', 'reportes', 'gastos'],
};

/** ¿El plan tiene habilitada esta capacidad? (chequea solo por plan, sin overrides de DB) */
export function planTiene(plan: PlanId, cap: Capacidad): boolean {
  return CAPACIDADES_POR_PLAN[plan].includes(cap);
}

/**
 * ¿El tenant tiene habilitada esta capacidad?
 * Combina el plan base con los overrides por tenant almacenados en plan_features.
 * Los overrides pueden activar o desactivar capacidades independientemente del plan.
 */
export function tenantTiene(
  plan: PlanId,
  cap: Capacidad,
  planFeatures?: Partial<Record<Capacidad, boolean>> | null,
): boolean {
  if (planFeatures && cap in planFeatures) return planFeatures[cap]!;
  return CAPACIDADES_POR_PLAN[plan].includes(cap);
}

/**
 * Ejemplos por rubro para los placeholders de la UI (según el plan del tenant).
 * `producto`: nombre de producto/ítem · `categoria`: nombre de categoría ·
 * `lineaSuelta`: ítem vendido sin estar en el catálogo (POS línea suelta).
 */
export const EJEMPLOS_PLAN: Record<PlanId, { producto: string; categoria: string; lineaSuelta: string }> = {
  servicios:    { producto: 'Service de aire split',          categoria: 'Mano de obra', lineaSuelta: 'Ej: Visita técnica' },
  market:       { producto: 'Alfajor Guaymallén - Chocolate', categoria: 'Golosinas',    lineaSuelta: 'Ej: Caramelos sueltos' },
  food:         { producto: 'Hamburguesa completa',           categoria: 'Hamburguesas', lineaSuelta: 'Ej: Adicional de queso' },
  balanza:      { producto: 'Bola de lomo',                   categoria: 'Carnes rojas', lineaSuelta: 'Ej: Bola de lomo 0.350 kg' },
  prestamista:  { producto: 'Producto o servicio',            categoria: 'Categoría',    lineaSuelta: 'Ej: Ítem' },
  atmosfericos: { producto: 'Servicio de pozo',               categoria: 'Zona',         lineaSuelta: 'Ej: Visita extra' },
};

/** Ejemplos de placeholders del plan (default: market si no se reconoce). */
export function ejemplosPlan(plan?: string | null) {
  return EJEMPLOS_PLAN[(plan ?? 'market') as PlanId] ?? EJEMPLOS_PLAN.market;
}
