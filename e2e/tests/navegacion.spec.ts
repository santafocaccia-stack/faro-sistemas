/**
 * Test de navegación completa — verifica que todas las rutas principales
 * cargan sin error 500 ni pantallas en blanco.
 */
import { test, expect } from '@playwright/test';

const RUTAS = [
  { path: '/dashboard',                     name: 'Dashboard' },
  { path: '/dashboard/ventas',              name: 'POS' },
  { path: '/dashboard/ventas/historial',    name: 'Historial ventas' },
  { path: '/dashboard/productos',           name: 'Productos' },
  { path: '/dashboard/productos/nuevo',     name: 'Nuevo producto' },
  { path: '/dashboard/clientes',            name: 'Clientes' },
  { path: '/dashboard/clientes/nuevo',      name: 'Nuevo cliente' },
  { path: '/dashboard/cc',                  name: 'Cuenta corriente' },
  { path: '/dashboard/presupuestos',        name: 'Presupuestos' },
  { path: '/dashboard/presupuestos/nuevo',  name: 'Nuevo presupuesto' },
  { path: '/dashboard/reportes',            name: 'Reportes' },
  { path: '/dashboard/config',              name: 'Configuración' },
  { path: '/dashboard/config/equipo',       name: 'Equipo' },
  { path: '/dashboard/proveedores',         name: 'Proveedores' },
  { path: '/dashboard/pedidos',             name: 'Pedidos' },
];

for (const ruta of RUTAS) {
  test(`${ruta.name} (${ruta.path}) — carga sin error`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const response = await page.goto(ruta.path);

    // No debe redirigir a login (sesión válida)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 8_000 });

    // HTTP response no debe ser 500
    if (response) {
      expect(response.status()).not.toBe(500);
    }

    // No debe haber texto de error crítico en pantalla
    await expect(page.locator('text=/Application error|500|Internal server error/i')).not.toBeVisible();

    // No debe estar completamente en blanco
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(10);

    // Errores de consola críticos
    const critical = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('hydrat') &&
      !e.includes('Warning:')
    );
    if (critical.length > 0) {
      console.warn(`[${ruta.name}] Errores de consola:`, critical);
    }
  });
}
