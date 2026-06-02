#!/usr/bin/env node
// Hook Stop: refresca la parte MECÁNICA de la capa de contexto (no resume con criterio).
// Regenera docs/context/_estado-git.md con fecha, rama, estado y últimos commits.
// Robusto: deriva la raíz del repo desde su propia ubicación y traga cualquier error
// para nunca bloquear el cierre de turno.
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

try {
  const here = dirname(fileURLToPath(import.meta.url));   // .claude/hooks
  const repo = join(here, '..', '..');                    // raíz del repo
  const git = (cmd) =>
    execSync(`git ${cmd}`, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

  const rama = git('branch --show-current') || '(detached)';
  const sync = git('status -sb').split('\n')[0] || '';
  const sucio = git('status --short');
  const commits = git('log --oneline -10');
  const head = git('rev-parse HEAD');

  // Gate: si HEAD + estado del working tree no cambiaron desde la última corrida,
  // no reescribir (evita el doble disparo Stop+SubagentStop y los turnos sin cambios).
  const cachePath = join(here, '.last-state');
  const firma = `${head}::${sucio}`;
  try {
    if (readFileSync(cachePath, 'utf8') === firma) process.exit(0);
  } catch { /* sin cache previa: seguir */ }

  const fecha = new Date().toISOString().slice(0, 16).replace('T', ' ');

  const out = `# Estado git (auto — generado por hook Stop)

> NO editar a mano. Se regenera al cerrar cada turno. Parte mecánica de la capa de
> contexto: la lee el orquestador y los subagentes para arrancar tibios.

- Actualizado: ${fecha}
- Rama: \`${rama}\`
- Sync: \`${sync}\`
- Working tree: ${sucio ? 'CON cambios sin commitear' : 'limpio'}

## Últimos 10 commits
\`\`\`
${commits}
\`\`\`
${sucio ? `\n## Archivos sin commitear\n\`\`\`\n${sucio}\n\`\`\`\n` : ''}`;

  mkdirSync(join(repo, 'docs', 'context'), { recursive: true });
  writeFileSync(join(repo, 'docs', 'context', '_estado-git.md'), out, 'utf8');
  writeFileSync(cachePath, firma, 'utf8');
} catch {
  // silencio intencional: el hook nunca debe romper el flujo
}
