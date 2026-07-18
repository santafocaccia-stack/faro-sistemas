/**
 * Modo interactivo del agente QA: mantiene el browser abierto y expone un
 * mini-API HTTP local para que un operador (humano o Claude Code en sesión)
 * actúe de cerebro. Complemento de runner.mjs (que usa `claude -p`).
 *
 * Uso: node qa/agente/servidor.mjs [--base URL] [--email E] [--password P] [--puerto 4599]
 *
 *   GET  /snapshot          → estado de pantalla + guarda screenshot
 *   POST /accion  {acciones:[...]} → ejecuta en orden, devuelve resultados + snapshot
 *   POST /cerrar            → cierra el browser y el servidor
 */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { snapshot, ejecutar, login } from './nucleo.mjs';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const BASE = opt('base', 'https://faro-sistemas-staging.vercel.app');
const EMAIL = opt('email', 'demo-servicios@gesto.app');
const PASSWORD = opt('password', 'demo1234');
const PUERTO = Number(opt('puerto', '4599'));
const capturas = join('qa', 'agente', 'reportes', 'capturas');
mkdirSync(capturas, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const erroresConsola = [];
page.on('console', (m) => {
  if (m.type() === 'error') erroresConsola.push(`[consola] ${m.text().slice(0, 200)}`);
});
page.on('response', (r) => {
  if (r.status() >= 500) erroresConsola.push(`[HTTP ${r.status()}] ${r.url().slice(0, 150)}`);
});

if (!(await login(page, BASE, EMAIL, PASSWORD))) {
  console.error('LOGIN FALLIDO');
  await browser.close();
  process.exit(1);
}
console.log(`LOGIN OK ${EMAIL}`);

let n = 0;
async function estado() {
  const snap = await snapshot(page);
  const captura = join(capturas, `paso-${String(++n).padStart(3, '0')}.png`);
  await page.screenshot({ path: captura });
  const errores = erroresConsola.splice(0);
  return { snap, captura, errores };
}

const server = createServer(async (req, res) => {
  const responder = (code, obj) => {
    res.writeHead(code, { 'content-type': 'application/json' });
    res.end(JSON.stringify(obj));
  };
  try {
    if (req.method === 'GET' && req.url === '/snapshot') return responder(200, await estado());
    // Descarga autenticada (comparte cookies de la sesión del browser)
    if (req.method === 'GET' && req.url?.startsWith('/descargar?ruta=')) {
      const ruta = decodeURIComponent(req.url.slice('/descargar?ruta='.length));
      const r = await page.request.get(BASE + ruta);
      const cuerpo = await r.body();
      return responder(200, {
        status: r.status(),
        contentType: r.headers()['content-type'] ?? '',
        bytes: cuerpo.length,
        cabecera: cuerpo.subarray(0, 8).toString('latin1'),
        finValido: cuerpo.subarray(-32).toString('latin1').includes('%%EOF'),
      });
    }
    if (req.method === 'POST' && req.url === '/cerrar') {
      responder(200, { ok: true });
      await browser.close();
      server.close();
      return;
    }
    if (req.method === 'POST' && req.url === '/accion') {
      let body = '';
      for await (const c of req) body += c;
      const { acciones } = JSON.parse(body);
      const resultados = [];
      for (const accion of acciones ?? []) {
        try {
          await ejecutar(page, accion, BASE);
          resultados.push({ accion, ok: true });
        } catch (e) {
          resultados.push({ accion, ok: false, error: e.message.split('\n')[0].slice(0, 180) });
          break;
        }
      }
      return responder(200, { resultados, ...(await estado()) });
    }
    responder(404, { error: 'ruta desconocida' });
  } catch (e) {
    responder(500, { error: e.message.slice(0, 300) });
  }
});
server.listen(PUERTO, '127.0.0.1', () => console.log(`SERVIDOR LISTO http://127.0.0.1:${PUERTO}`));
