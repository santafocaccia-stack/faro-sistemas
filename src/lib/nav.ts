import {
  LayoutDashboard, ShoppingCart, History, Package, Users,
  BookOpen, FileText, BarChart3, Truck, ClipboardList,
  UtensilsCrossed, Scale, type LucideIcon,
} from 'lucide-react';
import type { PlanId } from './planes';
import type { Rol } from '@/server/db/schema';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exactMatch?: boolean;
  pronto?: boolean;
};

/* ─────────────────────────────────────────────────────────────
   Nueva estructura: navegación plana, orientada a tareas.

   - `primary`: lista corta y fija que se muestra siempre arriba.
     Son las acciones del día a día (Inicio, Ventas, Productos,
     Clientes, Cuenta corriente).
   - `secondary`: ítems menos frecuentes que viven dentro de un
     desplegable "Más" para reducir ruido visual.

   El botón "Vender" (CTA principal) NO está acá: lo renderiza
   el sidebar como botón destacado.
───────────────────────────────────────────────────────────── */
export type NavPlan = {
  primary: NavItem[];
  secondary: NavItem[];
};

/* Items reutilizables */
const INICIO: NavItem        = { href: '/dashboard',                  label: 'Inicio',         icon: LayoutDashboard, exactMatch: true };
const HISTORIAL: NavItem     = { href: '/dashboard/ventas/historial', label: 'Historial',      icon: History };
const PRODUCTOS: NavItem     = { href: '/dashboard/productos',        label: 'Productos',      icon: Package };
const CLIENTES: NavItem      = { href: '/dashboard/clientes',         label: 'Clientes',       icon: Users };
const CTA_CORRIENTE: NavItem = { href: '/dashboard/cc',               label: 'Cta. corriente', icon: BookOpen };
const PRESUPUESTOS: NavItem  = { href: '/dashboard/presupuestos',     label: 'Presupuestos',   icon: FileText };
const PROVEEDORES: NavItem   = { href: '/dashboard/proveedores',      label: 'Proveedores',    icon: Truck };
const PEDIDOS: NavItem       = { href: '/dashboard/pedidos',          label: 'Pedidos',        icon: ClipboardList };
const REPORTES: NavItem      = { href: '/dashboard/reportes',         label: 'Reportes',       icon: BarChart3 };
const COCINA: NavItem        = { href: '/dashboard/cocina',           label: 'Cocina (KDS)',   icon: UtensilsCrossed, pronto: true };
const BALANZA: NavItem       = { href: '/dashboard/balanza',          label: 'Balanza',        icon: Scale, pronto: true };

export const NAV_POR_PLAN: Record<PlanId, NavPlan> = {

  servicios: {
    primary: [
      INICIO,
      HISTORIAL,
      PRESUPUESTOS,
      CLIENTES,
      CTA_CORRIENTE,
    ],
    secondary: [
      REPORTES,
    ],
  },

  market: {
    primary: [
      INICIO,
      HISTORIAL,
      PRODUCTOS,
      CLIENTES,
      CTA_CORRIENTE,
    ],
    secondary: [
      PROVEEDORES,
      PEDIDOS,
      REPORTES,
    ],
  },

  food: {
    primary: [
      INICIO,
      HISTORIAL,
      PRODUCTOS,
      CLIENTES,
      CTA_CORRIENTE,
    ],
    secondary: [
      PROVEEDORES,
      PEDIDOS,
      COCINA,
      REPORTES,
    ],
  },

  balanza: {
    primary: [
      INICIO,
      HISTORIAL,
      PRODUCTOS,
      CLIENTES,
      CTA_CORRIENTE,
    ],
    secondary: [
      PROVEEDORES,
      PEDIDOS,
      BALANZA,
      REPORTES,
    ],
  },
};

/* Ruta del POS por plan (todos usan la misma hoy, pero queda
   centralizado por si en el futuro algún plan tiene su propio flujo). */
export const POS_HREF = '/dashboard/ventas';

/* ─────────────────────────────────────────────────────────────
   Navegación filtrada por ROL.

   - empleado: solo puede usar el POS y ver el historial de ventas.
     No ve Inicio, Productos, Clientes, CC, Reportes ni Configuración.
   - admin / owner: navegación completa según el plan.
───────────────────────────────────────────────────────────── */
export function navParaRol(plan: PlanId, rol: Rol): NavPlan {
  const base = NAV_POR_PLAN[plan];
  if (rol === 'empleado') {
    return {
      primary: base.primary.filter((i) => i.href === HISTORIAL.href),
      secondary: [],
    };
  }
  return base;
}

/** ¿El rol puede acceder a secciones de gestión (config, equipo, etc.)? */
export function puedeGestionar(rol: Rol): boolean {
  return rol === 'owner' || rol === 'admin';
}
