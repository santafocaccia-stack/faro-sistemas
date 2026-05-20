import { test, expect } from '@playwright/test';

test.describe('Clientes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/clientes');
    await page.waitForLoadState('networkidle');
  });

  test('listado carga con clientes', async ({ page }) => {
    const rows = page.locator('tr').or(page.locator('[data-testid="cliente-row"]'));
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
  });

  test('botón "Nuevo cliente" existe y lleva al form', async ({ page }) => {
    const nuevoBtn = page.getByRole('link', { name: /nuevo cliente|agregar cliente/i });
    await expect(nuevoBtn).toBeVisible();
    await nuevoBtn.click();
    await expect(page).toHaveURL(/\/clientes\/nuevo/, { timeout: 8_000 });
  });

  test('form de nuevo cliente tiene campos requeridos', async ({ page }) => {
    await page.goto('/dashboard/clientes/nuevo');
    await page.waitForLoadState('networkidle');

    await expect(page.getByLabel(/razón social|nombre/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /guardar|crear/i })).toBeVisible();
  });

  test('ficha de cliente tiene saldo de cuenta corriente', async ({ page }) => {
    // Click en el primer cliente de la lista
    const firstClient = page.locator('tr a, [data-testid="cliente-row"] a').first();
    if (await firstClient.isVisible()) {
      await firstClient.click();
      await expect(page).toHaveURL(/\/clientes\/.+/, { timeout: 8_000 });
      // La ficha debe mostrar el saldo
      await expect(page.locator('text=/saldo|cuenta corriente/i')).toBeVisible({ timeout: 8_000 });
    }
  });
});
