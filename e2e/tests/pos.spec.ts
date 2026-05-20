import { test, expect } from '@playwright/test';

test.describe('POS — Punto de Venta', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/ventas');
    await page.waitForLoadState('networkidle');
  });

  test('carga la pantalla del POS correctamente', async ({ page }) => {
    // Debe haber una barra de búsqueda
    await expect(page.getByPlaceholder(/buscar producto|buscar\.\.\./i)).toBeVisible({ timeout: 10_000 });
  });

  test('switch minorista / mayorista existe', async ({ page }) => {
    // Texto exacto con case-sensitive (el componente usa "Minorista" y "Mayorista")
    await expect(page.getByRole('button', { name: 'Minorista' })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: 'Mayorista' })).toBeVisible();
  });

  test('buscar un producto muestra resultados', async ({ page }) => {
    const searchBox = page.getByPlaceholder(/buscar producto|buscar\.\.\./i);
    await searchBox.fill('a'); // "a" debería matchear algo en la demo
    await page.waitForTimeout(500); // debounce
    // Esperar que aparezca al menos una tarjeta de producto
    const productCards = page.locator('[data-testid="product-card"]').or(
      page.locator('button').filter({ hasText: /\$/ })
    );
    await expect(productCards.first()).toBeVisible({ timeout: 8_000 });
  });

  test('agregar un producto al carrito', async ({ page }) => {
    const searchBox = page.getByPlaceholder(/buscar producto|buscar\.\.\./i);
    await searchBox.fill('a');
    await page.waitForTimeout(500);

    // Los productos son botones con precio — click en el primero
    const firstProduct = page.locator('button').filter({ hasText: /\$/ }).first();
    await firstProduct.click();

    // El botón COBRAR debe seguir visible pero ahora habilitado
    const cobrarBtn = page.getByRole('button', { name: 'COBRAR' });
    await expect(cobrarBtn).toBeEnabled({ timeout: 5_000 });
  });

  test('el carrito está vacío al inicio', async ({ page }) => {
    // El botón "COBRAR" debe existir pero estar deshabilitado
    const cobrarBtn = page.getByRole('button', { name: 'COBRAR' });
    await expect(cobrarBtn).toBeVisible({ timeout: 5_000 });
    await expect(cobrarBtn).toBeDisabled();
  });

  test('botón Cobrar está deshabilitado sin productos', async ({ page }) => {
    // "COBRAR" en mayúsculas, deshabilitado sin productos
    await expect(page.getByRole('button', { name: 'COBRAR' })).toBeDisabled({ timeout: 5_000 });
  });
});
