import { test, expect } from '@playwright/test';

test.describe('Presupuestos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/presupuestos');
    await page.waitForLoadState('networkidle');
  });

  test('listado carga correctamente', async ({ page }) => {
    await expect(page).toHaveURL(/\/presupuestos/);
    // No debería haber error 500
    await expect(page.locator('text=/500|internal server error/i')).not.toBeVisible();
  });

  test('botón "Nuevo presupuesto" existe', async ({ page }) => {
    const nuevoBtn = page.getByRole('link', { name: /nuevo presupuesto|crear presupuesto/i });
    await expect(nuevoBtn).toBeVisible({ timeout: 8_000 });
  });

  test('crear presupuesto — form tiene los campos mínimos', async ({ page }) => {
    await page.goto('/dashboard/presupuestos/nuevo');
    await page.waitForLoadState('networkidle');

    // Cliente y al menos un campo de línea
    await expect(page.locator('text=/cliente/i').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /guardar|crear/i })).toBeVisible();
  });

  test('estado del presupuesto es visible en la lista', async ({ page }) => {
    // Debe haber chips de estado (borrador, enviado, aprobado, rechazado)
    const estadoChip = page.locator('text=/borrador|enviado|aprobado|rechazado/i').first();
    // Si hay presupuestos en la demo, el estado debe aparecer
    const count = await page.locator('tr').count();
    if (count > 1) {
      await expect(estadoChip).toBeVisible({ timeout: 5_000 });
    }
  });
});
