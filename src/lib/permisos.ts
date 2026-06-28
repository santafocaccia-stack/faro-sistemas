import type { Rol } from '@/server/db/schema';
import type { PlanId } from '@/lib/planes';

/**
 * Permisos granulares del sistema.
 * Cada permiso representa una sección/acción. Los roles definen un set por
 * defecto (preset); `users_tenants.permisos` permite overrides por usuario sin
 * cambiar su rol. Como `permisos` es jsonb, sumar permisos NO requiere migración.
 */
export type Permiso =
  | 'usar_pos'               // operar el punto de venta
  | 'gestionar_productos'    // CRUD de productos e inventario
  | 'gestionar_clientes'     // CRUD de clientes
  | 'gestionar_cc'           // ajustes en cuenta corriente
  | 'gestionar_proveedores'  // proveedores y pedidos de compra
  | 'gestionar_presupuestos' // presupuestos, boletas y agenda (servicios)
  | 'gestionar_prestamos'    // cartera de préstamos (prestamista)
  | 'gestionar_atmosfericos' // pedidos del día (atmosféricos)
  | 'ver_reportes'           // Inicio (KPIs), Reportes y Gastos/Balance
  | 'gestionar_config'       // configuración del negocio
  | 'gestionar_equipo';      // invitar / remover miembros y editar permisos

/** Todos los permisos, en orden de presentación en la UI. */
export const TODOS_LOS_PERMISOS: readonly Permiso[] = [
  'usar_pos',
  'gestionar_productos',
  'gestionar_clientes',
  'gestionar_cc',
  'gestionar_proveedores',
  'gestionar_presupuestos',
  'gestionar_prestamos',
  'gestionar_atmosfericos',
  'ver_reportes',
  'gestionar_config',
  'gestionar_equipo',
] as const;

/** Etiqueta legible de cada permiso (para la UI de Equipo). */
export const PERMISO_LABEL: Record<Permiso, { titulo: string; detalle: string }> = {
  usar_pos:               { titulo: 'Punto de venta',     detalle: 'Vender y ver el historial' },
  gestionar_productos:    { titulo: 'Productos',          detalle: 'Cargar y editar productos e inventario' },
  gestionar_clientes:     { titulo: 'Clientes',           detalle: 'Alta y edición de clientes' },
  gestionar_cc:           { titulo: 'Cuenta corriente',   detalle: 'Cobros y ajustes de saldos' },
  gestionar_proveedores:  { titulo: 'Proveedores',        detalle: 'Proveedores y pedidos de compra' },
  gestionar_presupuestos: { titulo: 'Presupuestos',       detalle: 'Presupuestos, boletas y agenda' },
  gestionar_prestamos:    { titulo: 'Préstamos',          detalle: 'Cartera de préstamos y cobranzas' },
  gestionar_atmosfericos: { titulo: 'Pedidos del día',    detalle: 'Hoja de ruta de pedidos atmosféricos' },
  ver_reportes:           { titulo: 'Reportes',           detalle: 'Inicio (KPIs), reportes y balance' },
  gestionar_config:       { titulo: 'Configuración',      detalle: 'Datos y preferencias del negocio' },
  gestionar_equipo:       { titulo: 'Equipo',             detalle: 'Invitar gente y asignar permisos' },
};

/**
 * Mapa ruta → permiso. Fuente única para guardar páginas y filtrar el nav.
 * Las subrutas (ej. /dashboard/ventas/historial) heredan del prefijo más largo
 * que matchee (ver `permisoDeRuta`).
 */
export const PERMISO_POR_HREF: Record<string, Permiso> = {
  '/dashboard':                  'ver_reportes',        // Inicio (KPIs)
  '/dashboard/ventas':           'usar_pos',
  '/dashboard/productos':        'gestionar_productos',
  '/dashboard/clientes':         'gestionar_clientes',
  '/dashboard/cc':               'gestionar_cc',
  '/dashboard/presupuestos':     'gestionar_presupuestos',
  '/dashboard/boletas':          'gestionar_presupuestos',
  '/dashboard/agenda':           'gestionar_presupuestos',
  '/dashboard/proveedores':      'gestionar_proveedores',
  '/dashboard/pedidos':          'gestionar_proveedores',
  '/dashboard/reportes':         'ver_reportes',
  '/dashboard/gastos':           'ver_reportes',
  '/dashboard/prestamos':        'gestionar_prestamos',
  '/dashboard/atmosfericos':     'gestionar_atmosfericos',
  '/dashboard/balanza':          'gestionar_productos',
  '/dashboard/cocina':           'usar_pos',
  '/dashboard/config/equipo':    'gestionar_equipo',
  '/dashboard/config':           'gestionar_config',
};

/** Permiso que protege una ruta (el prefijo más específico que matchee). */
export function permisoDeRuta(pathname: string): Permiso | null {
  let mejor: { href: string; permiso: Permiso } | null = null;
  for (const [href, permiso] of Object.entries(PERMISO_POR_HREF)) {
    if (pathname === href || pathname.startsWith(href + '/')) {
      if (!mejor || href.length > mejor.href.length) mejor = { href, permiso };
    }
  }
  return mejor?.permiso ?? null;
}

/**
 * Permisos por defecto del rol (cuando el usuario no tiene override).
 * owner/admin = todo. empleado = set operativo amplio; el nav lo filtra por
 * plan, así que en la práctica solo ve lo de su vertical (preserva el
 * comportamiento previo basado en rol+plan).
 */
const EMPLEADO_DEFAULT: readonly Permiso[] = [
  'usar_pos',
  'gestionar_productos',
  'gestionar_clientes',
  'gestionar_presupuestos',
  'gestionar_prestamos',
  'gestionar_atmosfericos',
];

export function permisosDefault(rol: Rol): readonly Permiso[] {
  if (rol === 'owner' || rol === 'admin') return TODOS_LOS_PERMISOS;
  return EMPLEADO_DEFAULT;
}

/** Sujeto mínimo para evaluar permisos (subset de Session). */
type Sujeto = { rol: Rol; permisos?: Permiso[] | null };

/** Permisos efectivos del usuario: override si tiene, si no los del rol. */
export function permisosEfectivos(s: Sujeto): readonly Permiso[] {
  if (s.permisos && s.permisos.length > 0) return s.permisos;
  return permisosDefault(s.rol);
}

/**
 * ¿El usuario tiene este permiso?
 * Si tiene overrides (no vacíos) se usan en lugar del rol. Array vacío o null →
 * defaults del rol.
 */
export function tienePermiso(s: Sujeto, permiso: Permiso): boolean {
  return permisosEfectivos(s).includes(permiso);
}

/** Permisos que tienen sentido togglear para un plan (para la UI de Equipo). */
export function permisosRelevantes(plan: PlanId): Permiso[] {
  const base: Record<PlanId, Permiso[]> = {
    market:       ['usar_pos', 'gestionar_productos', 'gestionar_clientes', 'gestionar_cc', 'gestionar_proveedores', 'ver_reportes', 'gestionar_config', 'gestionar_equipo'],
    food:         ['usar_pos', 'gestionar_productos', 'gestionar_clientes', 'gestionar_cc', 'gestionar_proveedores', 'ver_reportes', 'gestionar_config', 'gestionar_equipo'],
    balanza:      ['usar_pos', 'gestionar_productos', 'gestionar_clientes', 'gestionar_cc', 'gestionar_proveedores', 'ver_reportes', 'gestionar_config', 'gestionar_equipo'],
    servicios:    ['gestionar_presupuestos', 'gestionar_clientes', 'gestionar_cc', 'ver_reportes', 'gestionar_config', 'gestionar_equipo'],
    prestamista:  ['gestionar_prestamos', 'gestionar_clientes', 'ver_reportes', 'gestionar_config', 'gestionar_equipo'],
    atmosfericos: ['gestionar_atmosfericos', 'gestionar_clientes', 'ver_reportes', 'gestionar_config', 'gestionar_equipo'],
  };
  return base[plan];
}

/** Permisos considerados "de gestión" (acceso al área owner/admin). */
export const PERMISOS_GESTION: readonly Permiso[] = [
  'gestionar_productos',
  'gestionar_clientes',
  'gestionar_cc',
  'gestionar_proveedores',
  'gestionar_presupuestos',
  'gestionar_prestamos',
  'gestionar_atmosfericos',
  'ver_reportes',
  'gestionar_config',
  'gestionar_equipo',
];

/** ¿Tiene al menos un permiso de gestión? (para el guard del layout). */
export function tieneAlgunPermisoGestion(s: Sujeto): boolean {
  const efectivos = permisosEfectivos(s);
  return PERMISOS_GESTION.some((p) => efectivos.includes(p));
}

/** ¿Puede acceder a secciones de gestión? (compat con llamadas previas). */
export function puedeGestionar(s: Sujeto): boolean {
  return tieneAlgunPermisoGestion(s);
}
