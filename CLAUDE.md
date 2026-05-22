# Gesto (repo: faro-sistemas)

SaaS multi-tenant de gestión comercial para PyMEs argentinas (kioscos, carnicerías,
comida, servicios). Integra mayorista + minorista en un sistema. Deploy en Vercel:
`faro-sistemas-gold.vercel.app`.

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

### ✅ Construido y funcionando
- **Auth completa**: signup, login, reset-password, callback PKCE + token_hash
- **Multi-tenant + RLS**: 16 políticas, `byTenant()` en todas las queries
- **Roles**: owner / admin / empleado — control de acceso por route group y server actions
- **Onboarding**: wizard de primer uso (nombre negocio, canales)
- **POS minorista y mayorista**: split-screen, carrito Zustand, scanner ZXing (cámara)
- **Métodos de pago en POS**: efectivo, transferencia, tarjeta débito/crédito, Mercado Pago, cuenta corriente
- **Ticket / remito PDF**: `@react-pdf/renderer`, Web Share en mobile, descarga en desktop
- **Productos**: CRUD completo, Title Case, inputs numéricos vacíos (no 0)
- **Carga rápida de productos**: `/productos/carga-rapida` — scan → nombre → precio → Enter → siguiente
- **Importación CSV**: `/productos/importar-csv` — preview, validación, lotes de 100, crea categorías
- **Categorías**: filtro en lista y POS, CRUD
- **Grupos de variantes**: CRUD + sugerencia asistida al crear producto (primera palabra)
- **Proveedores**: CRUD, markup por proveedor, selector de país con banderas
- **Pedidos a proveedores**: armado desde ventas, confirmación por WhatsApp, recepción con ajuste de stock
- **Clientes**: CRUD, tipo (persona/empresa), condición IVA, descuento personalizado
- **Cuenta corriente**: movimientos, registrar pago, saldo en tiempo real
- **Presupuestos**: crear/editar, PDF compartible, estados (borrador/enviado/aceptado/rechazado)
- **Reportes**: KPIs por período (hoy / semana / mes / 3 meses), ventas por método de pago
- **Equipo**: invitar por email (Supabase Auth), editar rol, eliminar
- **Configuración negocio**: datos fiscales, canales, Mercado Pago (conectar/desconectar)
- **Planes y suscripción**: 4 planes, MP preapproval, webhook de activación/suspensión
- **Hardening server actions**: gestión → `requireAdmin()`, empleado solo accede a POS + Historial + Productos

---

## 🚀 Para lanzar (bloqueantes)

| # | Tarea | Por qué es bloqueante |
|---|---|---|
| 1 | **Dominio propio** (ej: `usegesto.app`) | La URL actual no es presentable para vender |
| 2 | **SMTP con Resend** — emails de invitación con branding, bienvenida, reset-password | Hoy Supabase envía emails sin marca — unprofessional |
| 3 | **Landing page pública** — `/` redirige al dashboard hoy | Sin landing no hay conversión orgánica |
| 4 | **PWA manifest + iconos** — `manifest.json`, iconos 192/512px, `apple-touch-icon` | El POS se usa en tablet/celular: sin PWA no se puede instalar |
| 5 | **Términos de servicio y Política de privacidad** | Requerido para cobrar con MP y cumplir RGPD/Ley 25.326 |

---

## 📋 Importantes (primera versión comercial)

| # | Tarea | Detalle |
|---|---|---|
| 6 | **Descuentos en POS** | Descuento % o $ por total de venta — muy pedido en kioscos/carnicerías |
| 7 | **Alertas de stock bajo** | Email/banner cuando `stockActual ≤ stockMinimo` — hoy el campo existe pero no dispara nada |
| 8 | **Facturación AFIP** (Tusfacturas.app) | Emisión de facturas A/B — bloqueante para el segmento servicios/mayorista |
| 9 | **Devoluciones / notas de crédito** | Reversar una venta total o parcial |
| 10 | **Export de datos** | CSV de ventas, inventario — para que el cliente no sienta que queda "encerrado" |
| 11 | **Historial de auditoría básico** | Quién creó/modificó qué — mínimo en productos y ventas |

---

## 🔒 Seguridad y calidad

| # | Tarea | Detalle |
|---|---|---|
| 12 | **Verificar firma de webhook MP** | Hoy cualquiera puede POST a `/api/mp-webhook` y manipular estados |
| 13 | **Rate limiting en auth** | Limitar intentos de login y signup (ej: `@upstash/ratelimit`) |
| 14 | **Tests de integración** | Al menos los flows de venta y creación de producto |

---

## 💡 Roadmap (v2)

- Gestión de mesas (Gesto Food)
- Integración balanza digital (Gesto Balanza)
- Modificadores por ítem (extras, variantes en POS)
- App mobile nativa con Capacitor (offline first)
- Notificaciones push (stock, pedidos)
- Dashboard financiero avanzado (márgenes, rentabilidad por producto)
- Multi-sucursal (múltiples tenants bajo una cuenta madre)

## Token economy (sesiones nuevas)
- NO releer archivos completos: usar Grep, o Read con offset+limit.
- NO releer este archivo, AGENTS.md ni ARCHITECTURE.md si ya están en el contexto.
- Editar con Edit (diff), no reescribir archivos enteros.
