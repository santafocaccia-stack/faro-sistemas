# Gesto (repo: faro-sistemas)

SaaS multi-tenant de gestión comercial para PyMEs argentinas (kioscos, carnicerías,
comida, servicios). Integra mayorista + minorista en un sistema. Deploy en Vercel:
`faro-sistemas.vercel.app`.

## Stack
- Next.js 15 App Router, TS estricto (sin `any`), Turbopack
- Tailwind v4 + shadcn/ui + design system "Brasas" (oscuros cálidos, naranja hue 43 oklch)
- Supabase (Postgres + Auth SSR `@supabase/ssr`), Drizzle ORM
- Zustand (carrito POS), Framer Motion, `@zxing/browser` (scanner), `@react-pdf/renderer`
- Pagos: Mercado Pago · AFIP: Tusfacturas.app · Email: Resend

## Reglas no negociables
- Multi-tenant: toda tabla y toda query filtra por `tenant_id`; helper `byTenant()`. RLS con `auth_tenant_id()`.
- Roles: `owner`, `admin`, `empleado`. Empleado solo accede a POS + Historial + Productos (`HREFS_EMPLEADO` en `src/lib/nav.ts`).
- Route group `(gestion)` = layout con `requireAdmin()`. `productos/` queda FUERA (empleado lo usa).
- Server Actions devuelven `{ ok, error }`, no lanzan (Next.js sanitiza errores en prod).
- Validación de input con Zod siempre. `optionalNumericString()` convierte `''` → null.
- Server Components por defecto; `'use client'` solo si hay interactividad real.

## Mapa rápido
- POS: `src/components/pos/` (`pos-container.tsx` + modales + `pos-scanner.tsx`)
- Carrito: `src/lib/stores/pos-cart.ts`
- Nav: `src/lib/nav.ts`, `dashboard-sidebar.tsx`, `mobile-bottom-nav.tsx`
- Auth/sesión: `src/server/auth/session.ts`, `src/app/auth/callback/route.ts`
- Acciones: `src/server/actions/` · Schemas Zod: `src/server/schemas/`
- DB: `src/server/db/schema/` (un archivo por dominio)
- URL de la app: `getAppUrl()` en `src/lib/app-url.ts`

## Comandos
`npm run dev` · `npm run build` · `npm run lint` · `npx drizzle-kit generate|migrate|studio`

## Convenciones
- Responder en español; comentarios y nombres de variables en español.
- Archivos `kebab-case`, componentes `PascalCase`, imports con alias `@/`.
- Nombres de producto en Title Case (respetar MAYÚSCULAS intencionales).

## Estado del producto
Inventario de features ✅, backlog de lanzamiento, importantes, seguridad y roadmap v2
viven en `docs/context/estado-producto.md` (lectura on-demand, no pesa en cada spawn).
Estado vivo y próximo paso: `PROGRESS.md`.

## Política de trabajo: modelos + capa de contexto

### Ruteo de modelos (Opus orquesta, lo barato ejecuta)
El hilo principal corre en Opus (planificación + coding). Delegá a subagentes el trabajo
de "leer mucho para destilar poco". Subagentes definidos en `.claude/agents/`:

| Tarea | Acción | Modelo |
|---|---|---|
| Planificar / decidir / arquitectura | hilo principal (no delegar) | Opus |
| Escribir / editar código de producto | hilo principal | Opus |
| Investigación / web research | subagente `investigador` | Sonnet |
| Búsqueda amplia en el codebase | subagente `explorador` | Haiku |
| QA / dogfooding / navegación | subagente `qa` | Sonnet |
| Docs / changelog / capa de contexto | subagente `documentador` | Sonnet |

Reglas: delegá solo tareas **chunky** (el subagente arranca en frío y eso cuesta); no
delegues cosas de 2 segundos. Al spawnear, pasá punteros en el prompt
(ej: "leé PROGRESS.md y docs/context/precios.md, después hacé X").

### Capa de contexto (arranque tibio de subagentes)
Tres niveles, de permanente a vivo:
- **Permanente** → `CLAUDE.md` (este archivo): stack, reglas, mapa. Carga solo.
- **Vivo** → `PROGRESS.md`: dónde estamos, próximo paso, pendientes. Actualizar al
  cerrar cada tarea (≤5 líneas de diff), con criterio.
- **Por dominio** → `docs/context/*.md`: detalle de un módulo (ej: `precios.md`).
  Actualizar al tocar ese módulo.
- **Mecánico/auto** → `docs/context/_estado-git.md`: lo regenera el hook `Stop` (no
  editar a mano). Fecha, rama, estado y últimos commits.

Todo subagente lee `PROGRESS.md` + `_estado-git.md` + su `docs/context/<modulo>.md`
antes de trabajar (está en su definición). El orquestador mantiene estos archivos.

### Token economy
- NO releer archivos completos: usar Grep, o Read con offset+limit.
- NO releer este archivo, AGENTS.md ni ARCHITECTURE.md si ya están en el contexto.
- Editar con Edit (diff), no reescribir archivos enteros.
- Actualizar la capa de contexto en límites de tarea, no en cada paso.
