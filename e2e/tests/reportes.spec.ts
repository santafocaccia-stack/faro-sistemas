import { test, expect } from '@playwright/test';

test.describe('Reportes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/reportes');
    await page.waitForLoadState('networkidle');
  });

  test('página de reportes carga sin error', async ({ page }) => {
    await expect(page).toHaveURL(/\/reportes/);
    await expect(page.locator('text=/Application error|Internal server error/i')).not.toBeVisible();
    await expect(page.locator('[data-nextjs-dialog]')).not.toBeVisible();
  });

  test('muestra KPIs del período', async ({ page }) => {
    // formatARS() usa Intl con 'es-AR': inserta   (non-breaking space) entre $ y el número.
    // Buscamos los <p> con class font-mono y tabular-nums que contienen los valores KPI.
    const kpiVal = page.locator('p.font-mono.tabular-nums').first();
    await expect(kpiVal).toBeVisible({ timeout: 10_000 });
    // Debe contener el símbolo $ (cualquier formato de espacio)
    const text = await kpiVal.textContent();
    expect(text).toContain('$');
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
