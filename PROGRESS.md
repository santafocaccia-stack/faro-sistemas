# PROGRESS — handoff de sesión (faro-sistemas / Gesto)

> Estado VIVO para retomar en chat nuevo gastando mínimo contexto.
> El resto (stack, reglas, mapa, backlog largo) ya está en `CLAUDE.md` — NO lo releas.
> Actualizado: 2026-07-07.

## Dónde quedamos
- **Auditoría integral 2026-07 COMPLETA — todo en PROD (2026-07-07)**: tareas #1-#9
  cerradas. En prod: 0014 (RLS, 27 policies, test-rls 8/8), 0015 (rol `gesto_app`
  sin bypass; password solo en env de Vercel), 0016 (índice pagos_prestamo),
  0017 (limpieza de policies legacy `auth_tenant_id()` que rompían a gesto_app,
  RLS off en `users` = paridad staging, y REVOKE de anon/authenticated sobre
  public — la app no usa el Data API). Vercel production: DATABASE_URL=gesto_app +
  DATABASE_URL_ADMIN=postgres vía API REST. Backup completo de datos pre-cutover
  en `backups/` (gitignoreado, 29 tablas / 247 filas) con `scripts/backup-db.mjs`.
  Además deployado: cifrado tokens MP (`MP_TOKEN_ENC_KEY` verificada en prod),
  rate limiting, CSP enforce, fixes OWASP, perf (unnest masivo), página Cocina,
  aria-labels.
- **RLS real — etapa 1 COMPLETA (2026-07-03, branch `staging`)**: los 35 archivos
  que usaban `db` migrados a `withTenant()` (tx + `SET LOCAL app.tenant_id`) o
  `dbAdmin` (cross-tenant explícito: sesión, webhooks, crons, super-admin, alta
  de tenant, huérfanos de equipo). SQL listo: `drizzle/0014_rls.sql` (policies
  fail-closed, seguro de aplicar ya — inerte mientras la app conecte como
  `postgres`, cierra PostgREST anon) y `drizzle/0015_rol_gesto_app.sql` (cutover:
  rol sin BYPASSRLS + cambio de DATABASE_URL; DATABASE_URL_ADMIN para dbAdmin).
  Fixes de paso: update de cobros-mp sin byTenant, Consumidor Final ahora
  protegido en update/desactivar de clientes, varias actions ahora atómicas.
  tsc/lint/tests(60)/build verdes.
- **RLS etapa 2 — STAGING COMPLETO (2026-07-04)**: 0014 aplicado en DB staging
  (28 policies; test 8/8 con rol sin bypass: fail-closed + aislamiento), rol
  `gesto_app` creado (0015) y **cutover hecho**: Vercel preview/staging usa
  DATABASE_URL=gesto_app + DATABASE_URL_ADMIN=postgres. Smoke HTTP verde.
  El password de gesto_app staging vive en la env DATABASE_URL de Vercel
  (preview/staging). Alias staging reapuntado; protección SSO de Vercel
  desactivada (staging vuelve a ser público). Scripts: `scripts/aplicar-sql.mjs`
  y `scripts/test-rls.mjs`.
  **Falta**: QA autenticado en staging, repetir 0014+0015+cutover en PROD, y
  tareas #2-#9 de la auditoría (tokens MP, rate limit, CSP, OWASP, calidad,
  perf, UX).
- Rama `master`. Build/typecheck/lint/tests verdes (60 tests).
- **Módulo Gastos + balance mensual con IA (2026-06-23) — deployado** (commit `7f27a32`):
  `/dashboard/gastos` para los 6 planes (capacidad `gastos`, admin). Carga de egresos
  con categorías sugeridas por rubro, balance del mes (ingresos del plan vs gastos),
  ganancia/margen, comparación vs mes anterior y **análisis narrativo con Claude**
  (`src/lib/ia/analisis-mensual.ts`, fallback determinístico sin API key). Cálculo puro
  testeado (`src/lib/balance.ts`, 9 tests). Migración `0011_gastos.sql` **aplicada en
  PROD** (no en dev: timeout IPv6, reintentar). Verificado en prod: página, carga de
  gasto y análisis fallback OK. **Pendiente tuyo:** cargar `ANTHROPIC_API_KEY` en Vercel
  para el análisis con IA real (sin eso usa el resumen automático).
- **QA de UIs por plan (2026-06-23)**: smoke test OK en los 6 planes (dashboards,
  historiales, agenda, reportes cargan 200 sin errores de consola). Único hallazgo:
  `/dashboard/cocina` (KDS de food) da 404 — está "pronto", conviene página "próximamente".
- **Auditoría de fechas y pagos (2026-06-23) — fixes aplicados**: helper compartido
  `src/lib/fechas.ts` (`sumarMeses` clampea fin de mes + `hoyArgentina`). Mata el
  overflow de `setMonth` en cronograma de préstamos, `masUnMes` (suscripción),
  webhook MP y recurrencia de agenda. Mora ahora usa `hoyArgentina()` (ART, no UTC).
  Webhook MP encadena desde `subscriptionEnd` (unificado con transferencia).
  `session.ts` bloquea suscripción `activo`/`moroso` vencida (3 días de gracia).
  Tests: `src/lib/__tests__/{fechas,prestamos}.test.ts`. Falta: validación de UI con
  cuenta `demo-prestamista@gesto.app` (sembrar préstamo backdated) — usar `/browse`.
- Últimas features cerradas: **#57 firma webhook MP** (fail-closed en prod) y
  **cobro por transferencia + panel super-admin** (`/admin/suscripciones`).
- **Pendiente de aplicar**: migración `0008_pagos_suscripcion.sql` en Supabase
  (dev y prod). Es SQL manual idempotente (como 0005-0007) — pegar en el SQL editor.
- **Env vars nuevas** a cargar (Vercel + `.env.local`): `SUPER_ADMIN_EMAILS`,
  `TRANSFER_TITULAR/BANCO/CBU/ALIAS/CUIT`, `MP_WEBHOOK_SECRET`, `RESEND_API_KEY`.
- **Auditoría de seguridad E2E (2026-06-21) — fixes aplicados** (tsc/lint/build/tests
  verdes): IDOR token MP cerrado, `recibirPedido` con byTenant, escalación de rol
  bloqueada, OAuth MP con `state` anti-CSRF, crons fail-closed, escape en emails,
  guard test `src/server/__tests__/tenant-isolation.test.ts`. **RLS no protege la
  capa de app** (Drizzle=postgres) → byTenant es la única defensa. Detalle y
  pendientes en memoria `project_gesto_seguridad`.

## Últimos commits
Ver `docs/context/_estado-git.md` (lo regenera el hook automáticamente — no duplicar acá).
Resumen histórico del trabajo nocturno: `docs/RESUMEN-NOCHE-2026-06-02.md`.

## Próximo paso sugerido
- **Landing pública v3 "de oficio" — LIVE y pulida** (2026-06-21, tsc/build verdes, QA
  visual con Playwright). Identidad de cartel de comercio sobre el tema "Brasas":
  tipografía Anton (titulares-letrero) + Hanken Grotesk + JetBrains Mono (via `next/font`,
  vars `--gl-*`); sellos de goma, subrayado pintado, grano + viñeta, franja marquee.
  Secciones: hero con titular fijo ("Tu negocio al alcance de tu mano") + entrada
  animada; "por dentro" con **switcher de rubro en tarjetas auto-rotativo** (5s, barra
  de progreso, pausa en hover) que transforma la ventana de app (nav real de
  `navParaRol`/`planTiene`, KPIs); **sección "desde el celular"** con **foto real**
  (`public/landing/comerciante-escaneando.png`, generada con Higgsfield/nano_banana_pro)
  + mockup de celular Gesto flotando; **demo POS que imprime un ticket de papel** al
  cobrar; antes/después; bento de beneficios; pricing de `PLANES_ARRAY` al MEP; **FAQ**
  (acordeón); CTA fijo en mobile; scroll suave. Copy reescrito: voz simple/directa,
  "cuenta corriente" (no "fiado"), sin Carnicería/Food (próximamente). Archivos en
  `src/components/landing/`: `landing-client.tsx`, `landing-scan.tsx`, `landing-pos.tsx`,
  `landing-sections.tsx`, `landing-data.ts`, `landing.css`; monta desde `src/app/page.tsx`.
  Mockup HTML autónomo de referencia en `C:\Users\Tomi\Documents\Claude Code\gesto-landing.html`.
  **Refinamientos por feedback del dueño (2026-06-21)**: hero con garantías limpias
  (sin sellos-cartel) + subtítulo más grande con "cuenta corriente" en acento;
  descripción del rubro protagonista; acento de marca **fijo en naranja** con el color
  por rubro scopeado a app+POS; sección "desde el celular" usa **captura real** de Gesto
  (`public/landing/captura-gesto.jpeg`) en el marco en vez del mockup HTML; **login/auth
  rediseñado** a split-screen cálido (`src/app/(auth)/layout.tsx`: panel de marca Anton +
  beneficios; logo duplicado oculto en desktop en login/signup).
  **Posibles mejoras futuras** (no pedidas aún): testimonios reales, métricas de prueba
  social honestas, más fotos por rubro, video corto del producto, calentar copy de signup.
- **Precios vivos** endurecido tras revisión (flag server-side, Zod, rango de margen,
  confirm). Ver `docs/context/precios.md`. Falta: QA en vivo (los 3 planes) y decidir
  si se expone como acción destacada en Productos. Quedan 🟡 menores anotados.

## Decisiones/acciones que dependen de vos (bloquean avance)
1. **Cobro suscripción / Mobbex**: falta CUIT (Monotributo) + cuenta Mobbex. Mientras,
   ⚠️ trial vencido traba al cliente en /planes. Decidir: activación manual o trial largo.
2. **Emails**: cron listo, NO envía hasta cargar `RESEND_API_KEY` en Vercel (rotá la vieja).
3. **Catálogo global** (cross-tenant): necesita tu OK explícito antes de implementar.
4. **Notificación Horus**: pasar endpoint/token Phone Bridge o reconectar Remote Control.

## Pendientes técnicos prioritarios (de CLAUDE.md, no repetir todo)
- Bloqueantes de lanzamiento: dominio propio, SMTP Resend con branding,
  PWA manifest+iconos. **Landing pública ✓** (v3) y **páginas legales ✓** (ya abajo).
- **Legal HECHO (2026-06-21)**: `/legal/{terminos,privacidad,cookies,baja-de-datos}`
  como páginas Next con layout de marca (`src/app/legal/`), links en footer y checkbox
  de aceptación en signup; `/legal` marcado público en `src/lib/supabase/middleware.ts`.
  Responsable = Tomás de Sousa (persona física). **FALTA (acción del usuario)**: completar
  placeholders resaltados — [CUIT], [DOMICILIO], [EMAIL DE CONTACTO], [JURISDICCIÓN] — y
  que un abogado revise los textos (sobre todo tratamiento de datos de terceros y AFIP).
- Seguridad: verificar firma webhook MP, rate limiting en auth, tests de venta/producto.

## Cómo seguir barato en el chat nuevo
- Leer SOLO este archivo + los 2-3 archivos de código que vas a tocar (Grep, no Read full).
- No releer CLAUDE.md / AGENTS.md / ARCHITECTURE.md (ya cargan solos).
- Editar con diffs (Edit), no reescribir archivos enteros.
