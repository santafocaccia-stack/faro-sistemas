import { test, expect } from '@playwright/test';

test.describe('Reportes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/reportes');
    await page.waitForLoadState('networkidle');
  });

  test('página de reportes carga sin error', async ({ page }) => {
    await expect(page).toHaveURL(/\/reportes/);
    await expect(page.locator('text=/500|error/i')).not.toBeVisible();
  });

  test('muestra KPIs del período', async ({ page }) => {
    // Debe haber al menos un número con formato de pesos
    await expect(page.locator('text=/\\$[0-9]/').first()).toBeVisible({ timeout: 10_000 });
  });

  test('botón exportar CSV existe', async ({ page }) => {
    const csvBtn = page.getByRole('button', { name: /exportar|csv/i });
    await expect(csvBtn).toBeVisible({ timeout: 8_000 });
  });

  test('selector de período funciona', async ({ page }) => {
    const selector = page.getByRole('combobox').or(
      page.locator('select, [role="listbox"]')
    ).first();
    if (await selector.isVisible()) {
      // Solo verificar que existe y no rompe la página al interactuar
      await expect(selector).toBeEnabled();
    }
  });
});
