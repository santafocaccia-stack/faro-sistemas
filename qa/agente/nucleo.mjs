/** Núcleo compartido del agente QA: snapshot, acciones y login. */

export async function snapshot(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const sel = 'a[href], button, input, select, textarea, [role="button"], [role="menuitem"], [role="option"], [role="tab"], [role="combobox"], [contenteditable="true"]';
    const els = [...document.querySelectorAll(sel)].filter(visible).slice(0, 120);
    const items = els.map((el, i) => {
      el.setAttribute('data-qa-ref', String(i));
      const label =
        el.getAttribute('aria-label') ||
        el.getAttribute('placeholder') ||
        (el.innerText || '').trim().slice(0, 60) ||
        el.getAttribute('name') ||
        el.getAttribute('href') ||
        '';
      const tag = el.tagName.toLowerCase();
      const tipo = el.getAttribute('type') || el.getAttribute('role') || '';
      const valor = 'value' in el && el.value ? ` valor="${String(el.value).slice(0, 30)}"` : '';
      return `[${i}] <${tag}${tipo ? ` ${tipo}` : ''}>${valor} ${label}`.trim();
    });
    const alertas = [...document.querySelectorAll('[role="alert"], [role="status"], [data-sonner-toast]')]
      .map((e) => (e.innerText || '').trim())
      .filter(Boolean);
    return {
      url: location.pathname + location.search,
      titulo: document.title,
      alertas,
      texto: (document.body.innerText || '').replace(/\n{3,}/g, '\n\n').slice(0, 2000),
      elementos: items,
    };
  });
}

export async function ejecutar(page, accion, base) {
  const loc = accion.ref != null ? page.locator(`[data-qa-ref="${accion.ref}"]`).first() : null;
  switch (accion.accion) {
    case 'click':
      await loc.click({ timeout: 8000 });
      break;
    case 'fill':
      await loc.fill(String(accion.valor ?? ''), { timeout: 8000 });
      break;
    case 'select':
      await loc.selectOption(String(accion.valor ?? ''), { timeout: 8000 });
      break;
    case 'press':
      await page.keyboard.press(accion.valor || 'Enter');
      break;
    case 'goto':
      await page.goto(base + accion.valor, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      break;
    case 'scroll':
      await page.mouse.wheel(0, accion.valor === 'arriba' ? -600 : 600);
      break;
    case 'esperar':
      await page.waitForTimeout(Math.min(Number(accion.valor) || 1500, 5000));
      break;
    default:
      throw new Error(`Acción desconocida: ${accion.accion}`);
  }
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
}

/** Login determinístico con reintentos (headless en Windows es flaky). */
export async function login(page, base, email, password, intentos = 3) {
  for (let i = 1; i <= intentos; i++) {
    try {
      await page.goto(`${base}/login`, { waitUntil: 'networkidle', timeout: 45_000 });
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard**', { timeout: 30_000 });
      return true;
    } catch (e) {
      console.error(`Login intento ${i} falló: ${e.message.slice(0, 120)}`);
    }
  }
  return false;
}
