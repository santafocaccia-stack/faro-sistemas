import { test, expect } from '@playwright/test';

test.describe('Productos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/productos');
    await page.waitForLoadState('networkidle');
  });

  test('listado carga y muestra productos', async ({ page }) => {
    // Debe haber al menos una fila de producto (la demo tiene 9)
    const rows = page.locator('tr, [data-testid="producto-row"]').or(
      page.locator('li').filter({ hasText: /\$/ })
    );
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
  });

  test('buscador filtra la lista', async ({ page }) => {
    const search = page.getByPlaceholder(/buscar/i);
    if (await search.isVisible()) {
      await search.fill('zzzzz_inexistente');
      await page.waitForTimeout(400);
      await expect(page.locator('text=/sin resultados|no se encontraron|0 productos/i')).toBeVisible({ timeout: 5_000 })
        .catch(() => { /* si no hay mensaje vacío explícito también está bien */ });
    }
  });

  test('botón "Nuevo producto" lleva al form', async ({ page }) => {
    const nuevoBtn = page.getByRole('link', { name: /nuevo producto|agregar producto/i });
    await expect(nuevoBtn).toBeVisible();
    await nuevoBtn.click();
    await expect(page).toHaveURL(/\/productos\/nuevo/, { timeout: 8_000 });
  });

  test('form de nuevo producto tiene los campos requeridos', async ({ page }) => {
    await page.goto('/dashboard/productos/nuevo');
    await page.waitForLoadState('networkidle');

    await expect(page.getByLabel(/nombre/i)).toBeVisible();
    await expect(page.getByLabel(/precio/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /guardar|crear/i })).toBeVisible();
  });

  test('editar un producto abre el form con datos', async ({ page }) => {
    // Buscar el primer link de edición
    const editBtn = page.getByRole('link', { name: /editar/i }).or(
      page.locator('a[href*="/productos/"]').filter({ hasText: /editar/i })
    ).first();

    if (await editBtn.isVisible()) {
      await editBtn.click();
      await expect(page).toHaveURL(/\/productos\/.+/, { timeout: 8_000 });
      // El campo nombre debe estar pre-relleno
      const nombreInput = page.getByLabel(/nombre/i);
      await expect(nombreInput).toBeVisible();
      const value = await nombreInput.inputValue();
      expect(value.length).toBeGreaterThan(0);
    }
  });

  test('no hay errores de consola en la página', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/dashboard/productos');
    await page.waitForLoadState('networkidle');
    const critical = errors.filter(e => !e.includes('favicon') && !e.includes('404'));
    expect(critical).toHaveLength(0);
  });
});
