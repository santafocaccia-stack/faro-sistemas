import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('carga sin errores y muestra el saludo', async ({ page }) => {
    // El h1 siempre muestra "Buenos días/tardes/noches, nombre 👋"
    await expect(page.getByRole('heading', { level: 1 }).filter({ hasText: /buen/i })).toBeVisible({ timeout: 10_000 });
  });

  test('muestra los 3 KPI cards (Hoy / Semana / Cobros)', async ({ page }) => {
    // Cada card tiene un <p> con label "Hoy", "Semana" o "Cobros" en uppercase
    await expect(page.locator('p').filter({ hasText: /^Hoy$/ })).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('p').filter({ hasText: /^Semana$/ })).toBeVisible();
    await expect(page.locator('p').filter({ hasText: /^Cobros$/ })).toBeVisible();
  });

  test('botón VENDER está visible y lleva al POS', async ({ page }) => {
    const venderBtn = page.getByRole('link', { name: /vender/i }).first();
    await expect(venderBtn).toBeVisible();
    await venderBtn.click();
    await expect(page).toHaveURL(/\/dashboard\/ventas/);
  });

  test('sidebar muestra el nombre del negocio', async ({ page }) => {
    // El sidebar desktop muestra el nombre del tenant
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    // Debe tener algún texto que no sea "Gesto" hardcodeado
    await expect(sidebar.locator('p').first()).not.toBeEmpty();
  });

  test('links de navegación primaria funcionan', async ({ page }) => {
    const navLinks = [
      { label: /inicio/i, url: /\/dashboard$/ },
      { label: /ventas|historial/i, url: /\/ventas/ },
      { label: /clientes/i, url: /\/clientes/ },
    ];

    for (const link of navLinks) {
      await page.goto('/dashboard');
      const anchor = page.getByRole('link', { name: link.label }).first();
      await expect(anchor).toBeVisible();
      await anchor.click();
      await expect(page).toHaveURL(link.url, { timeout: 8_000 });
    }
  });

  test('no hay errores de consola críticos', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('404') && !e.includes('hydrat')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
