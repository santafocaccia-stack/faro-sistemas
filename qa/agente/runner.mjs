/**
 * Agente QA autónomo — ver qa/agente/README.md
 *
 * Manos: Playwright (Chromium headless). Cerebro: `claude -p` (CLI, suscripción).
 * Uso: node qa/agente/runner.mjs qa/agente/personas/01-tecnico-refrigeracion.md
 *      [--base URL] [--email E] [--password P] [--max-turnos N] [--visible]
 */
import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { snapshot, ejecutar as ejecutarAccion, login } from './nucleo.mjs';

// ── Args ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const personaPath = args.find((a) => !a.startsWith('--'));
if (!personaPath) {
  console.error('Uso: node qa/agente/runner.mjs <persona.md> [--base URL] [--max-turnos N]');
  process.exit(1);
}
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const BASE = opt('base', 'https://faro-sistemas-staging.vercel.app');
const EMAIL = opt('email', 'demo-servicios@gesto.app');
const PASSWORD = opt('password', 'demo1234');
const MAX_TURNOS = Number(opt('max-turnos', '30'));
const HEADLESS = !args.includes('--visible');

const persona = readFileSync(personaPath, 'utf8');
const slug = basename(personaPath, '.md');
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const outDir = join('qa', 'agente', 'reportes', `${slug}-${stamp}`);
mkdirSync(outDir, { recursive: true });

const trace = [];
const hallazgos = [];
const erroresConsola = [];

// ── Cerebro: claude -p ──────────────────────────────────────────
function consultarCerebro(prompt) {
  const r = spawnSync('claude', ['-p', '--output-format', 'json'], {
    input: prompt,
    encoding: 'utf8',
    shell: true,
    maxBuffer: 20 * 1024 * 1024,
    timeout: 240_000,
  });
  if (r.status !== 0 || !r.stdout) {
    throw new Error(`claude -p falló (status ${r.status}): ${(r.stderr || '').slice(0, 500)}`);
  }
  const wrapper = JSON.parse(r.stdout);
  const texto = wrapper.result ?? '';
  // El resultado puede venir con fences ```json ... ```
  const m = texto.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`El cerebro no devolvió JSON: ${texto.slice(0, 300)}`);
  return JSON.parse(m[0]);
}

// ── Prompt del cerebro ──────────────────────────────────────────
function armarPrompt(snap, turno) {
  const historial = trace
    .map((t, i) => {
      const full = i >= trace.length - 6;
      const acciones = full
        ? t.acciones.map((a) => `  - ${JSON.stringify(a.accion)}${a.error ? ` → ERROR: ${a.error}` : ' → ok'}`).join('\n')
        : '';
      return `Turno ${i + 1} [${t.url}]: ${t.pensamiento}${acciones ? '\n' + acciones : ''}`;
    })
    .join('\n');
  const yaRegistrados = hallazgos.map((h) => `- (${h.tipo}) ${h.detalle}`).join('\n') || '(ninguno)';
  return `Sos un agente de QA que actúa como un usuario real de Gesto (SaaS de gestión comercial argentino). Estás usando la app de verdad con un browser. Tu identidad y tu misión:

${persona}

REGLAS:
- Actuá como la persona: si algo no se entiende a la primera, es un hallazgo.
- Registrá hallazgos con tipo: "bug" (roto/error), "friccion" (se pudo pero costó), "faltante" (lo esperaba y no existe), "mejora" (idea). Severidad: "alta"|"media"|"baja". NO repitas hallazgos ya registrados.
- Usá los elementos numerados [N] del snapshot para actuar (ref: N). Podés emitir hasta 5 acciones por turno; se ejecutan en orden y se cortan si una falla.
- Acciones posibles: {"accion":"click","ref":N} | {"accion":"fill","ref":N,"valor":"texto"} | {"accion":"select","ref":N,"valor":"opcion"} | {"accion":"press","valor":"Enter"} | {"accion":"goto","valor":"/dashboard/..."} | {"accion":"scroll","valor":"abajo"|"arriba"} | {"accion":"esperar","valor":1500}
- Cuando completes TODA la misión (o quedes trabado sin salida), devolvé "terminado": true con un "resumen" final honesto respondiendo las preguntas de la misión.
- Turno ${turno} de ${MAX_TURNOS}: administrá el tiempo, no des vueltas.

HALLAZGOS YA REGISTRADOS:
${yaRegistrados}

HISTORIAL:
${historial || '(recién empezás, ya estás logueado en el dashboard)'}

PANTALLA ACTUAL (${snap.url} — "${snap.titulo}"):
${snap.alertas.length ? 'ALERTAS/TOASTS: ' + snap.alertas.join(' | ') + '\n' : ''}TEXTO VISIBLE:
${snap.texto}

ELEMENTOS INTERACTIVOS:
${snap.elementos.join('\n')}

Respondé SOLO con un JSON (sin texto extra, sin fences):
{"pensamiento":"qué ves y qué vas a hacer (1-2 frases)","hallazgos":[{"tipo":"...","severidad":"...","detalle":"..."}],"acciones":[...],"terminado":false,"resumen":null}`;
}

// ── Reporte ─────────────────────────────────────────────────────
function escribirReporte(resumen, motivo) {
  const orden = { alta: 0, media: 1, baja: 2 };
  const porTipo = (tipo) =>
    hallazgos
      .filter((h) => h.tipo === tipo)
      .sort((a, b) => (orden[a.severidad] ?? 3) - (orden[b.severidad] ?? 3))
      .map((h) => `- **[${h.severidad}]** ${h.detalle} _(turno ${h.turno})_`)
      .join('\n') || '_(ninguno)_';
  const md = `# Reporte QA — ${slug}

- **Fecha**: ${new Date().toISOString()}
- **Base**: ${BASE} · **Cuenta**: ${EMAIL}
- **Turnos**: ${trace.length}/${MAX_TURNOS} · **Cierre**: ${motivo}

## Resumen del agente

${resumen || '_(sin resumen — la corrida no llegó a terminar)_'}

## Bugs
${porTipo('bug')}

## Fricciones
${porTipo('friccion')}

## Faltantes
${porTipo('faltante')}

## Mejoras
${porTipo('mejora')}

## Errores técnicos capturados (consola/red)
${erroresConsola.slice(0, 30).map((e) => `- ${e}`).join('\n') || '_(ninguno)_'}
`;
  writeFileSync(join(outDir, 'reporte.md'), md);
  writeFileSync(join(outDir, 'trace.json'), JSON.stringify({ trace, hallazgos, erroresConsola }, null, 2));
  console.log(`\nReporte: ${join(outDir, 'reporte.md')}`);
}

// ── Main ────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: HEADLESS });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (m) => {
  if (m.type() === 'error') erroresConsola.push(`[consola] ${m.text().slice(0, 200)}`);
});
page.on('response', (r) => {
  if (r.status() >= 500) erroresConsola.push(`[HTTP ${r.status()}] ${r.url().slice(0, 150)}`);
});

const logueado = await login(page, BASE, EMAIL, PASSWORD);
if (!logueado) {
  await page.screenshot({ path: join(outDir, 'login-fallido.png') });
  escribirReporte(null, 'login fallido tras 3 intentos');
  await browser.close();
  process.exit(1);
}
console.log(`Login OK como ${EMAIL} — arranca la misión (${MAX_TURNOS} turnos máx)`);

let motivo = 'límite de turnos alcanzado';
let resumenFinal = null;

for (let turno = 1; turno <= MAX_TURNOS; turno++) {
  const snap = await snapshot(page);
  await page.screenshot({ path: join(outDir, `turno-${String(turno).padStart(2, '0')}.png`) });

  let decision;
  try {
    decision = consultarCerebro(armarPrompt(snap, turno));
  } catch (e) {
    console.error(`Turno ${turno}: cerebro falló (${e.message.slice(0, 150)}), reintento…`);
    try {
      decision = consultarCerebro(armarPrompt(snap, turno));
    } catch (e2) {
      motivo = `cerebro falló dos veces: ${e2.message.slice(0, 150)}`;
      break;
    }
  }

  for (const h of decision.hallazgos ?? []) hallazgos.push({ ...h, turno });
  const registro = { turno, url: snap.url, pensamiento: decision.pensamiento, acciones: [] };
  trace.push(registro);
  console.log(`T${turno} [${snap.url}] ${decision.pensamiento}`);
  for (const h of decision.hallazgos ?? []) console.log(`   ⚑ ${h.tipo}/${h.severidad}: ${h.detalle}`);

  if (decision.terminado) {
    resumenFinal = decision.resumen;
    motivo = 'misión completada por el agente';
    break;
  }

  for (const accion of decision.acciones ?? []) {
    const reg = { accion };
    registro.acciones.push(reg);
    try {
      await ejecutarAccion(page, accion, BASE);
    } catch (e) {
      reg.error = e.message.split('\n')[0].slice(0, 180);
      break; // el resto del batch ya no es confiable
    }
  }
}

escribirReporte(resumenFinal, motivo);
await browser.close();
