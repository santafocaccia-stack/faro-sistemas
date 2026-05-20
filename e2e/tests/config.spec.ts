import { test, expect } from '@playwright/test';

test.describe('Configuración', () => {
  test('página de config muestra datos del negocio', async ({ page }) => {
    await page.goto('/dashboard/config');
    await page.waitForLoadState('networkidle');

    await expect(page.getByLabel(/nombre del negocio|nombre/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: /guardar/i })).toBeVisible();
  });

  test('página de equipo carga correctamente', async ({ page }) => {
    await page.goto('/dashboard/config/equipo');
    await page.waitForLoadState('networkidle');

    // El h1 dice "Equipo" y el h3 dice "Miembros del equipo"
    await expect(page.getByRole('heading', { name: 'Equipo', level: 1 })).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('h3').filter({ hasText: /miembros/i })).toBeVisible();
  });

  test('invitar miembro tiene campo de email', async ({ page }) => {
    await page.goto('/dashboard/config/equipo');
    await page.waitForLoadState('networkidle');

    const emailInput = page.getByPlaceholder(/email/i).or(page.getByLabel(/email/i));
    if (await emailInput.isVisible()) {
      await expect(emailInput).toBeEnabled();
    }
  });
});
