/**
 * Layout de gestión — guard de rol.
 *
 * Todas las páginas dentro de (gestion) son de owner/admin: Inicio (KPIs),
 * Productos, Clientes, Cuenta corriente, Presupuestos, Proveedores,
 * Pedidos, Reportes y Configuración.
 *
 * requireAdmin() redirige al rol 'empleado' al POS — su única pantalla.
 * El route group (gestion) no cambia las URLs: /dashboard, /dashboard/productos,
 * etc. siguen funcionando igual.
 */
import { requireAdmin } from '@/server/auth/session';

export default async function GestionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return <>{children}</>;
}
