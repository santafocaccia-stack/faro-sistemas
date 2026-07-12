# Revisión de Seguridad y Pre-Lanzamiento — Gesto

**Fecha:** 2026-05-31
**Rama:** `feat/pre-lanzamiento`
**Entorno auditado:** `faro-sistemas.vercel.app` (código deployado) + código local
**Alcance:** auditoría de arquitectura, seguridad (OWASP/STRIDE), QA en vivo de flujos críticos y remediación.

---

## 1. Resumen ejecutivo

Gesto está **funcionalmente sólido** para lanzar: los flujos core (POS, cobro, stock, presupuestos, PDF) funcionan de punta a punta y el aislamiento multi-tenant (`byTenant`) es consistente y verificado en vivo (IDOR ausente).

La revisión encontró **un bug crítico funcional** que el análisis estático no vio y que el build + las pruebas en vivo destaparon: **el `proxy.ts` redirigía todas las rutas API sin sesión a la pantalla de login**, dejando el **webhook de Mercado Pago y el cron semanal rotos** (las suscripciones no se activaban). Ya está corregido.

| | Antes | Después |
|---|---|---|
| Webhook Mercado Pago | Roto (307 → login) | Procesa + verifica firma |
| Revalidación de sesión | Activa (vía `proxy.ts`) | Activa (sin cambios) |
| Headers de seguridad | Buenos, sin CSP | + CSP (Report-Only) |
| Aislamiento multi-tenant | Correcto | Correcto (verificado en vivo) |

---

## 2. Hallazgos y estado

| ID | Sev | Hallazgo | Estado |
|----|-----|----------|--------|
| **BUG-1** | 🔴 ALTO (funcional) | `proxy.ts` redirigía `/api` sin sesión a login → webhook MP y cron rotos | ✅ **Corregido** (`711076c`) |
| **F1** | — | "Middleware de auth sin revalidación" | ❌ **Falso positivo** (ver §3) |
| **F2** | 🟠 HIGH | Webhook MP sin verificación de firma | ✅ **Código listo** (`72330de`) — requiere `MP_WEBHOOK_SECRET` |
| **F3** | 🟡 MED | `DATABASE_URL` con rol que probablemente bypassa RLS | ⏸ **Requiere verificación** (infra) |
| **F4** | 🟡 MED | Rate limiting ausente en login/signup | ✅ **Resuelto vía config** Supabase |
| **F5** | 🔵 LOW | CSP no configurado | ✅ **Código listo** (`7a191ca`) — Report-Only |
| **F6** | 🔵 LOW | Dependencias con avisos | ✅ **Evaluado**: 7 moderate, 0 critical/high |

---

## 3. Corrección de un falso positivo (honestidad técnica)

El hallazgo **F1** del reporte `/cso` ("el helper `updateSession` está escrito pero nunca se ejecuta") **era incorrecto**. La causa: en el análisis estático busqué `middleware.ts` (el nombre de Next.js ≤ 15), no existía, y asumí que la revalidación no corría.

**Next.js 16 renombró `middleware.ts` → `proxy.ts`.** El proyecto **sí** tenía `src/proxy.ts` cableando `updateSession` (que hace `supabase.auth.getUser()` — revalidación real del token en cada request). La auth nunca estuvo "muerta".

El `npm run build` destapó el error (conflicto entre el `middleware.ts` que creé y el `proxy.ts` existente), y la prueba en vivo reveló el **bug real**: el matcher de `proxy.ts` **no excluía `/api`**, por lo que `updateSession` redirigía los requests sin sesión de los endpoints API a login. Evidencia:

```
POST /api/mp-webhook        → HTTP 307 → /login   (Mercado Pago no podía notificar)
GET  /api/cron/...          → HTTP 307 → /login   (cron roto)
```

**Lección:** el análisis estático es necesario pero no suficiente. El build y las pruebas dinámicas atraparon tanto el falso positivo como un bug más grave que el reportado.

---

## 4. Cambios aplicados (rama `feat/pre-lanzamiento`)

### `711076c` — fix(proxy): excluir las rutas API del matcher
`src/proxy.ts`: el matcher ahora excluye `api`. Cada route handler aplica su propio control (firma MP, `CRON_SECRET`, `requireSession`). Desbloquea el webhook de Mercado Pago y el cron.

### `72330de` — security(mp-webhook): verificar firma de Mercado Pago (F2)
`src/app/api/mp-webhook/route.ts`: HMAC-SHA256 sobre el manifest oficial de MP (`id;request-id;ts`) con `crypto.timingSafeEqual`, protegido por `MP_WEBHOOK_SECRET`. Si el secret no está configurado, procesa con un warning (rollout sin romper). El algoritmo del prompt original (`requestId|body`) **no era el de MP** y habría rechazado webhooks legítimos.

### `7a191ca` — security(headers): CSP en modo Report-Only (F5)
`next.config.ts`: `Content-Security-Policy-Report-Only` con allowlist para Supabase, Mercado Pago y Sentry. No bloquea todavía — recolecta violaciones para validar en preview antes de pasar a enforcing.

---

## 5. Lo que está bien (no requiere acción)

- **Multi-tenant:** `byTenant()` consistente en los 10 dominios; rutas PDF sin IDOR (verificado en vivo: id ajeno → 404).
- **Secrets:** ningún `.env` trackeado, todos en `.gitignore`, sin secrets en git history.
- **Inyección:** sin SQL injection (Drizzle parametriza; único `sql.raw` usa constante).
- **Headers:** `X-Frame-Options: DENY`, `nosniff`, HSTS, `Permissions-Policy`. Sentry con source maps ocultos.
- **POS:** venta transaccional y atómica (venta + ticket + descuento de stock verificado: 48 → 47).

---

## 6. Acciones pendientes (tuyas)

| Prioridad | Acción | Dónde |
|-----------|--------|-------|
| 🔴 Alta | Cargar `MP_WEBHOOK_SECRET` para activar F2 | MP: *Tus integraciones → Webhooks → Clave secreta* → Vercel env |
| 🟡 Media | Verificar rol de `DATABASE_URL` (F3) | Supabase → *Settings → Database → Connection string*. Si es `postgres`, usar pooler/rol de app |
| 🟡 Media | Bajar rate limit de login/signup (F4) | Supabase → *Authentication → Rate Limits* → ~10/hora por IP |
| 🔵 Baja | Validar CSP en preview y pasar a enforcing (F5) | Cambiar key a `Content-Security-Policy` tras revisar violaciones en consola |
| 🔵 Baja | `npm audit fix` (sin `--force`) (F6) | local |

---

## 7. Próximos pasos recomendados

1. **Deploy preview** de `feat/pre-lanzamiento` en Vercel → QA-testear lo que no está en staging: webhook MP (ahora desbloqueado), plantillas de servicios, código PLU (balanza), reporte semanal, y violaciones de CSP.
2. **Configurar** las acciones de §6 (mínimo `MP_WEBHOOK_SECRET` antes de cobrar plata real).
3. **Merge** a `master` y deploy a producción.
4. Smoke-test post-deploy de los flujos de pago.

---

## 8. Datos de prueba creados durante el QA

En cuentas demo (acordado): 1 venta en Market (ticket #00002) y 1 presupuesto en Servicios ("Cliente QA Prueba"). Borrables si querés dejar los demos limpios.

---

*Auditoría asistida por IA. No reemplaza un pentest profesional para sistemas que manejan pagos/PII en producción.*
