import { test, expect } from '@playwright/test';

test.describe('Clientes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/clientes');
    await page.waitForLoadState('networkidle');
  });

  test('listado carga con clientes', async ({ page }) => {
    // Los clientes usan <table> — buscamos las filas de datos (no el header)
    await expect(page.locator('table')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('tbody tr').first()).toBeVisible();
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
    // El link al cliente está solo en la primera columna de cada fila
    const firstClientLink = page.locator('table a').first();
    await expect(firstClientLink).toBeVisible({ timeout: 8_000 });
    await firstClientLink.click();
    await expect(page).toHaveURL(/\/clientes\/.+/, { timeout: 8_000 });
    // La ficha muestra la columna "Saldo" o "Cuenta corriente"
    await expect(page.locator('text=/saldo|cuenta corriente/i')).toBeVisible({ timeout: 8_000 });
  });
});
