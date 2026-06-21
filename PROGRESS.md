# PROGRESS — handoff de sesión (faro-sistemas / Gesto)

> Estado VIVO para retomar en chat nuevo gastando mínimo contexto.
> El resto (stack, reglas, mapa, backlog largo) ya está en `CLAUDE.md` — NO lo releas.
> Actualizado: 2026-06-21.

## Dónde quedamos
- Rama `master`. Build/typecheck/lint verdes.
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
- **Landing pública v2 — REDISEÑO HECHO** (2026-06-21, tsc/dev verdes). Concepto
  "el producto es el héroe": ventana de app realista que se transforma entera por
  rubro (sidebar+KPIs+pantalla), POS interactivo, antes/después, bento, pricing al MEP.
  Tema "Brasas" reusando tokens OKLCH reales; tipografía nueva Bricolage Grotesque +
  Onest + JetBrains Mono (via `next/font`, vars `--gl-*`). Archivos en
  `src/components/landing/`: `landing-client.tsx` (estado de rubro + hero + ventana),
  `landing-pos.tsx`, `landing-sections.tsx`, `landing-data.ts`, `landing.css`; monta
  desde `src/app/page.tsx`. Nav real derivada de `navParaRol`/`planTiene`, pricing de
  `PLANES_ARRAY`. **Falta**: QA visual en navegador (capturas), responsive fino, deploy.
  Mockup HTML autónomo de referencia en `C:\Users\Tomi\Documents\Claude Code\gesto-landing.html`.
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
- Bloqueantes de lanzamiento: dominio propio, SMTP Resend con branding, landing pública,
  PWA manifest+iconos, ToS + Política de privacidad.
- Seguridad: verificar firma webhook MP, rate limiting en auth, tests de venta/producto.

## Cómo seguir barato en el chat nuevo
- Leer SOLO este archivo + los 2-3 archivos de código que vas a tocar (Grep, no Read full).
- No releer CLAUDE.md / AGENTS.md / ARCHITECTURE.md (ya cargan solos).
- Editar con diffs (Edit), no reescribir archivos enteros.
