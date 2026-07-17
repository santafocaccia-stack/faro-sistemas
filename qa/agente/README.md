# Agente QA autónomo

Un agente que usa Gesto de punta a punta como lo haría un usuario real, con una
**persona** por rubro. No sigue pasos fijos: recibe una misión ("presupuestá el
arreglo de un split, mandá el PDF, agendá la visita, cobrala") y tiene que
lograrla navegando la app como pueda — igual que un usuario nuevo. Todo lo que
le cueste, falle o falte queda registrado como hallazgo.

## Arquitectura

- **Manos**: Playwright (Chromium headless) — navega, clickea, tipea, saca screenshots.
- **Cerebro**: `claude -p` (CLI de Claude Code, usa la suscripción — no necesita API key).
  En cada turno recibe la persona, la misión, el historial y un snapshot de la
  pantalla (elementos interactivos numerados) y devuelve JSON con las próximas
  acciones y los hallazgos que detectó.
- **Salida**: `reportes/<persona>-<fecha>/` con `reporte.md` (hallazgos con
  severidad), `trace.json` (cada turno y acción) y screenshots.

## Uso

```bash
# Contra staging (default)
node qa/agente/runner.mjs qa/agente/personas/01-tecnico-refrigeracion.md

# Opciones
node qa/agente/runner.mjs <persona.md> --base http://localhost:3000 --max-turnos 25
```

Cuenta demo del plan servicios: `demo-servicios@gesto.app` / `demo1234`
(el runner la usa por default; se puede pisar con `--email` / `--password`).

## Personas

Cada archivo en `personas/` tiene frontmatter (`nombre`, `rubro`) y dos
secciones: **Quién sos** (contexto humano: cómo trabaja, qué sabe de tecnología)
y **Misión** (el objetivo de negocio de la corrida, NO los pasos de UI).

## Cómo leer el reporte

Hallazgos por severidad: `bug` (algo roto), `friccion` (se pudo pero costó),
`faltante` (lo esperaba y no existe), `mejora` (idea). Los flujos que salgan
limpios acá se cristalizan después como tests E2E de Playwright clásicos.
