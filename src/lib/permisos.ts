import type { Rol } from '@/server/db/schema';

/**
 * Permisos granulares del sistema.
 * Cada permiso representa una acción o sección específica.
 * Los roles tienen permisos por defecto; users_tenants.permisos permite
 * overrides por usuario sin cambiar su rol.
 */
export type Permiso =
  | 'usar_pos'              // operar el punto de venta
  | 'gestionar_productos'   // CRUD de productos e inventario
  | 'gestionar_clientes'    // CRUD de clientes
  | 'gestionar_cc'          // ajustes en cuenta corriente
  | 'gestionar_proveedores' // proveedores y pedidos de compra
  | 'gestionar_presupuestos'// presupuestos y cobros de servicios
  | 'ver_reportes'          // acceso a /reportes
  | 'gestionar_config'      // configuración del negocio
  | 'gestionar_equipo';     // invitar / remover miembros del equipo

export const PERMISOS_POR_ROL: Record<Rol, readonly Permiso[]> = {
  owner: [
    'usar_pos',
    'gestionar_productos',
    'gestionar_clientes',
    'gestionar_cc',
    'gestionar_proveedores',
    'gestionar_presupuestos',
    'ver_reportes',
    'gestionar_config',
    'gestionar_equipo',
  ],
  admin: [
    'usar_pos',
    'gestionar_productos',
    'gestionar_clientes',
    'gestionar_cc',
    'gestionar_proveedores',
    'gestionar_presupuestos',
    'ver_reportes',
    'gestionar_config',
    // gestionar_equipo solo para owners
  ],
  empleado: [
    'usar_pos',
    'gestionar_productos', // cargar/editar productos en caja
    'gestionar_clientes',  // registrar cliente en POS
  ],
};

/**
 * ¿El usuario tiene este permiso?
 * Si tiene overrides (permisos en users_tenants), se usan en lugar del rol.
 * Si el array de overrides está vacío, se usan los del rol.
 */
export function tienePermiso(
  session: { rol: Rol; permisos?: Permiso[] | null },
  permiso: Permiso,
): boolean {
  if (session.permisos && session.permisos.length > 0) {
    return session.permisos.includes(permiso);
  }
  return PERMISOS_POR_ROL[session.rol].includes(permiso);
}

/** ¿Puede acceder a secciones de gestión (config, equipo, reportes)? */
export function puedeGestionar(
  session: { rol: Rol; permisos?: Permiso[] | null },
): boolean {
  return tienePermiso(session, 'gestionar_config');
}
