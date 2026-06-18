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

  test('botón "Nuevo presupuesto" existe (solo plan servicios)', async ({ page }) => {
    // Presupuestos solo existe en plan servicios. Si la página devuelve 404, el test pasa igual.
    const is404 = await page.locator('text=404').isVisible();
    if (is404) return; // plan market u otro — skip
    const nuevoBtn = page.locator('a[href*="/presupuestos/nuevo"]').first();
    await expect(nuevoBtn).toBeVisible({ timeout: 8_000 });
  });

  test('crear presupuesto — form tiene los campos mínimos (solo plan servicios)', async ({ page }) => {
    await page.goto('/dashboard/presupuestos/nuevo');
    await page.waitForLoadState('networkidle');
    const is404 = await page.locator('text=404').isVisible();
    if (is404) return; // plan market u otro — skip
    await expect(page.locator('text=/cliente/i').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /crear presupuesto|guardar cambios/i })).toBeVisible({ timeout: 8_000 });
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
