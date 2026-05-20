/**
 * Setup global: hace login con la cuenta demo y guarda la sesión.
 * Todos los demás tests reutilizan esta sesión sin volver a loguearse.
 */
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const SESSION_FILE = path.join(__dirname, '../.auth/session.json');

setup('login demo', async ({ page }) => {
  await page.goto('/login');

  await page.locator('#email').fill('prueba@gesto.app');
  await page.locator('#password').fill('prueba1234');
  await page.getByRole('button', { name: /ingresar/i }).click();

  // Esperar a que llegue al dashboard
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  await expect(page).toHaveURL(/\/dashboard/);

  // Guardar cookies + localStorage
  await page.context().storageState({ path: SESSION_FILE });
});
