/**
 * Onboarding guiado por rubro — "Richard", el compañero que recibe al usuario.
 *
 * Richard saluda con el nombre del negocio la primera vez (pantalla de
 * bienvenida) y después acompaña con una checklist de primeros pasos hasta
 * dejar el negocio listo. Cada plan tiene su propia secuencia: lo que tiene
 * sentido cargar primero cambia según la vertical (un kiosco carga productos;
 * un prestamista, su cartera; un atmosférico, su hoja de ruta).
 *
 * Este módulo es puro (sin React ni server-only) para que lo usen tanto la
 * pantalla de bienvenida como la checklist, y el server para calcular progreso.
 */
import type { PlanId } from '@/lib/planes';

/** El nombre y la "voz" del compañero. Centralizado por si cambia. */
export const RICHARD = {
  nombre: 'Richard',
  /** Frase corta que Richard dice arriba de la checklist. */
  lemaChecklist: 'Seguí estos pasos y te dejo el negocio listo para trabajar.',
} as const;

/** Claves de progreso que el server calcula consultando la base. */
export type ProgresoKey =
  | 'datosNegocio'
  | 'productos'
  | 'clientes'
  | 'ventas'
  | 'presupuestos'
  | 'prestamos'
  | 'pedidosAtmosfericos';

export type ProgresoOnboarding = Record<ProgresoKey, boolean>;

/** Iconos por paso (se mapean a lucide en el componente cliente). */
export type IconKey = 'config' | 'productos' | 'clientes' | 'ventas' | 'presupuesto' | 'prestamo' | 'pedido';

export type PasoOnboarding = {
  key: ProgresoKey;
  label: string;
  descripcion: string;
  href: string;
  icon: IconKey;
  /** Pasos opcionales no cuentan para "completar" el onboarding. */
  opcional?: boolean;
};

export type OnboardingPlan = {
  /** Bajada de Richard en la bienvenida: qué vamos a dejar listo en este rubro. */
  bienvenidaSub: string;
  pasos: PasoOnboarding[];
};

/* Pasos compartidos entre planes (para no repetir copy). */
const PASO_DATOS: PasoOnboarding = {
  key: 'datosNegocio',
  label: 'Completar los datos del negocio',
  descripcion: 'Dirección y teléfono para tus comprobantes (el CUIT es opcional)',
  href: '/dashboard/config',
  icon: 'config',
};

const PASO_CLIENTES = (descripcion: string, opcional = false): PasoOnboarding => ({
  key: 'clientes',
  label: 'Cargar tus clientes',
  descripcion,
  href: '/dashboard/clientes/nuevo',
  icon: 'clientes',
  opcional,
});

/* Configuración por rubro. */
const POS_PASOS: PasoOnboarding[] = [
  PASO_DATOS,
  {
    key: 'productos',
    label: 'Cargar tus productos',
    descripcion: 'Usá la carga rápida: escaneá, nombre, precio y listo',
    href: '/dashboard/productos/carga-rapida',
    icon: 'productos',
  },
  PASO_CLIENTES('Para fiar en cuenta corriente y guardar su historial', true),
  {
    key: 'ventas',
    label: 'Hacer tu primera venta',
    descripcion: 'Probá el punto de venta',
    href: '/dashboard/ventas',
    icon: 'ventas',
  },
];

export const ONBOARDING_POR_PLAN: Record<PlanId, OnboardingPlan> = {
  market: {
    bienvenidaSub: 'Te ayudo a dejar el negocio listo para vender: cargamos tus datos, tus productos y hacés tu primera venta.',
    pasos: POS_PASOS,
  },
  food: {
    bienvenidaSub: 'Te ayudo a dejar el local listo para arrancar: tus datos, tu carta de productos y tu primera venta.',
    pasos: POS_PASOS,
  },
  balanza: {
    bienvenidaSub: 'Te ayudo a dejar el negocio listo para vender: tus datos, tus productos por peso y tu primera venta.',
    pasos: POS_PASOS,
  },
  servicios: {
    bienvenidaSub: 'Te ayudo a arrancar: tus datos, tus clientes y tu primer presupuesto en PDF.',
    pasos: [
      PASO_DATOS,
      PASO_CLIENTES('La gente a la que le prestás servicio'),
      {
        key: 'presupuestos',
        label: 'Crear tu primer presupuesto',
        descripcion: 'Armalo y enviálo en PDF en minutos',
        href: '/dashboard/presupuestos/nuevo',
        icon: 'presupuesto',
      },
    ],
  },
  prestamista: {
    bienvenidaSub: 'Te ayudo a ordenar tu cartera: tus datos, tus clientes y tu primer préstamo con cuotas.',
    pasos: [
      PASO_DATOS,
      PASO_CLIENTES('Tus deudores: a quiénes les vas a prestar'),
      {
        key: 'prestamos',
        label: 'Registrar tu primer préstamo',
        descripcion: 'Con cronograma de cuotas automático',
        href: '/dashboard/prestamos/nuevo',
        icon: 'prestamo',
      },
    ],
  },
  atmosfericos: {
    bienvenidaSub: 'Te ayudo a organizar tu día: tus datos, tus clientes y tu primera hoja de ruta.',
    pasos: [
      PASO_DATOS,
      PASO_CLIENTES('Con dirección y litros estimados del pozo'),
      {
        key: 'pedidosAtmosfericos',
        label: 'Cargar tu primer pedido del día',
        descripcion: 'Armá la hoja de ruta de hoy',
        href: '/dashboard/atmosfericos',
        icon: 'pedido',
      },
    ],
  },
};

/** Pasos del plan (todos, incluidos los opcionales). */
export function pasosDelPlan(plan: PlanId): PasoOnboarding[] {
  return ONBOARDING_POR_PLAN[plan].pasos;
}

/** Claves que hace falta completar (excluye los opcionales). */
export function clavesRequeridas(plan: PlanId): ProgresoKey[] {
  return pasosDelPlan(plan).filter((p) => !p.opcional).map((p) => p.key);
}

/** ¿El tenant ya completó todos los pasos requeridos de su rubro? */
export function onboardingCompletado(plan: PlanId, progreso: ProgresoOnboarding): boolean {
  return clavesRequeridas(plan).every((k) => progreso[k]);
}
