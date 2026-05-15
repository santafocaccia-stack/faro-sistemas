import {
  LayoutDashboard, ShoppingCart, History, Package, Users,
  BookOpen, FileText, BarChart3, Truck, ClipboardList,
  UtensilsCrossed, Scale, type LucideIcon,
} from 'lucide-react';
import type { PlanId } from './planes';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exactMatch?: boolean;
  pronto?: boolean;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

const INICIO: NavSection = {
  title: '',
  items: [{ href: '/dashboard', label: 'Inicio', icon: LayoutDashboard, exactMatch: true }],
};

const CONFIG_SECTION: NavSection = {
  title: 'Sistema',
  items: [
    { href: '/dashboard/config/equipo', label: 'Equipo',         icon: Users },
    { href: '/dashboard/config',        label: 'Configuración',  icon: LayoutDashboard },
  ],
};

export const NAV_POR_PLAN: Record<PlanId, NavSection[]> = {

  servicios: [
    INICIO,
    {
      title: 'Trabajo',
      items: [
        { href: '/dashboard/presupuestos',     label: 'Presupuestos',    icon: FileText },
        { href: '/dashboard/ventas/historial', label: 'Historial cobros', icon: History },
      ],
    },
    {
      title: 'Clientes',
      items: [
        { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
      ],
    },
    {
      title: 'Análisis',
      items: [
        { href: '/dashboard/reportes', label: 'Reportes', icon: BarChart3 },
      ],
    },
  ],

  market: [
    INICIO,
    {
      title: 'Ventas',
      items: [
        { href: '/dashboard/ventas',           label: 'Punto de venta', icon: ShoppingCart, exactMatch: true },
        { href: '/dashboard/ventas/historial', label: 'Historial',      icon: History },
      ],
    },
    {
      title: 'Administración',
      items: [
        { href: '/dashboard/productos',    label: 'Productos',      icon: Package },
        { href: '/dashboard/clientes',     label: 'Clientes',       icon: Users },
        { href: '/dashboard/cc',           label: 'Cta. corriente', icon: BookOpen },
        { href: '/dashboard/proveedores',  label: 'Proveedores',    icon: Truck },
        { href: '/dashboard/pedidos',      label: 'Pedidos',        icon: ClipboardList },
      ],
    },
    {
      title: 'Análisis',
      items: [
        { href: '/dashboard/reportes', label: 'Reportes', icon: BarChart3 },
      ],
    },
  ],

  food: [
    INICIO,
    {
      title: 'Ventas',
      items: [
        { href: '/dashboard/ventas',           label: 'Punto de venta', icon: ShoppingCart, exactMatch: true },
        { href: '/dashboard/ventas/historial', label: 'Historial',      icon: History },
        { href: '/dashboard/cocina',           label: 'Cocina (KDS)',   icon: UtensilsCrossed, pronto: true },
      ],
    },
    {
      title: 'Administración',
      items: [
        { href: '/dashboard/productos',    label: 'Productos',      icon: Package },
        { href: '/dashboard/clientes',     label: 'Clientes',       icon: Users },
        { href: '/dashboard/cc',           label: 'Cta. corriente', icon: BookOpen },
        { href: '/dashboard/proveedores',  label: 'Proveedores',    icon: Truck },
        { href: '/dashboard/pedidos',      label: 'Pedidos',        icon: ClipboardList },
      ],
    },
    {
      title: 'Análisis',
      items: [
        { href: '/dashboard/reportes', label: 'Reportes', icon: BarChart3 },
      ],
    },
  ],

  balanza: [
    INICIO,
    {
      title: 'Ventas',
      items: [
        { href: '/dashboard/ventas',           label: 'Punto de venta', icon: ShoppingCart, exactMatch: true },
        { href: '/dashboard/ventas/historial', label: 'Historial',      icon: History },
        { href: '/dashboard/balanza',          label: 'Balanza',        icon: Scale, pronto: true },
      ],
    },
    {
      title: 'Administración',
      items: [
        { href: '/dashboard/productos',    label: 'Productos',      icon: Package },
        { href: '/dashboard/clientes',     label: 'Clientes',       icon: Users },
        { href: '/dashboard/cc',           label: 'Cta. corriente', icon: BookOpen },
        { href: '/dashboard/proveedores',  label: 'Proveedores',    icon: Truck },
        { href: '/dashboard/pedidos',      label: 'Pedidos',        icon: ClipboardList },
      ],
    },
    {
      title: 'Análisis',
      items: [
        { href: '/dashboard/reportes', label: 'Reportes', icon: BarChart3 },
      ],
    },
  ],
};
