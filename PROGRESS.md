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
