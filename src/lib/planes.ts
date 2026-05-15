export type PlanId = 'servicios' | 'market' | 'food' | 'balanza';

export const PLANES = {
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
  },
  balanza: {
    id: 'balanza' as PlanId,
    nombre: 'Gesto Balanza',
    precioUsd: 32,
    descripcion: 'Para carnicerías, verdulerías y venta por peso',
    features: [
      'Todo lo de Market',
      'Integración con balanza digital',
      'Venta por kilogramo',
      'Categorías y grupos de variantes',
    ],
    color: 'oklch(0.62 0.16 320)',
  },
} as const;

export const PLANES_ARRAY = Object.values(PLANES);
