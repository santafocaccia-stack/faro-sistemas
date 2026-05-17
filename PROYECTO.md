# Gesto — Resumen técnico completo del proyecto

> Documento para onboarding de IA. Describe el producto, la arquitectura, el stack, las reglas del código y el estado actual.

---

## 1. Qué es el producto

**Gesto** es un SaaS de gestión comercial para negocios argentinos (kioscos, carnicerías, verdulerías, hamburgueserías, prestadores de servicios). Lo desarrolla **Faro Sistemas**.

El objetivo es ser una alternativa simple, mobile-first y asequible a sistemas como Bind ERP o Gestión Simple, cobrado en **dólares MEP** para protegerse de la inflación argentina.

### Planes disponibles

| Plan | Precio USD/mes | Público objetivo |
|------|---------------|-----------------|
| Gesto Servicios | $15 | Trabajadores independientes, prestadores de servicios |
| Gesto Market | $24 | Kioscos, ferreterías, comercios generales |
| Gesto Food | $40 | Gastronomía (hamburguesas, pizzerías) |
| Gesto Balanza | $32 | Carnicerías, verdulerías — venta por peso |

- **Trial de 14 días** sin tarjeta de crédito al registrarse.
- Al vencer el trial → redirige a `/planes` para suscribirse.
- Cada plan tiene su propio menú lateral (ven solo lo que usan).

---

## 2. Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | **Next.js 15** (App Router, TypeScript strict) |
| UI | **Tailwind CSS v4** + componentes propios inspirados en shadcn/ui |
| Base de datos | **PostgreSQL** via **Supabase** |
| ORM | **Drizzle ORM** (type-safe, sin Prisma) |
| Auth | **Supabase Auth** (email/password, SSR con cookies) |
| Deploy | **Vercel** (producción: `https://faro-sistemas-gold.vercel.app`) |
| Pagos suscripción | **Mercado Pago Preapproval API** (Faro cobra a los negocios) |
| Pagos del negocio | **Mercado Pago OAuth** (el negocio cobra a sus clientes via QR/tarjeta) |
| Tipo de cambio | `dolarapi.com/v1/dolares/bolsa` (MEP, revalidado cada hora) |
| PDF | `@react-pdf/renderer` |
| Repo | GitHub: `santafocaccia-stack/faro-sistemas` |
| Entorno local | `.env.local` con todas las variables |

---

## 3. Arquitectura multi-tenant

**Regla de oro:** todo dato pertenece a un tenant. Cada tabla tiene `tenant_id` como FK a `tenants.id`.

```
users (1) ──< users_tenants >── (1) tenants
                                      │
              ┌───────────────────────┤
              │                       │
           productos              clientes
           ventas                 proveedores
           ventas_lineas          pedidos
           presupuestos           categorias
           cuenta_corriente       grupos_variantes
           producto_proveedores
```

### Helper de seguridad

```typescript
// src/server/db/tenant-context.ts
export function byTenant(tenantId: string, table) {
  return eq(table.tenantId, tenantId);
}
```

**Toda server action** empieza así:
```typescript
const session = await requireSession();
// ...luego siempre agrega byTenant(session.tenantId, tabla) en el WHERE
```

---

## 4. Autenticación y sesión

### Flujo de auth
1. Usuario se registra en `/signup` → Supabase crea el usuario auth
2. Si no tiene tenant → lo redirige a `/onboarding`
3. En onboarding elige plan y nombre del negocio → `crearTenant()` crea tenant + user + users_tenants + cliente "Consumidor Final"
4. Redirige a `/dashboard` con `window.location.href` (recarga completa para que el servidor lea el nuevo tenant)

### `requireSession()` — `src/server/auth/session.ts`

```typescript
export async function requireSession(opts?: { allowExpired?: boolean }): Promise<Session>
```

- Si no hay usuario auth → `redirect('/login')`
- Si no hay membership → `redirect('/onboarding')`
- Si trial vencido o status suspendido/cancelado → `redirect('/planes')` (salvo que `allowExpired: true`)
- Retorna: `{ userId, email, tenantId, rol, plan, status, trialEnd }`

### Middleware (`src/lib/supabase/middleware.ts`)
Solo refresca la cookie de sesión Supabase y redirige a `/login` si no hay usuario. **No verifica tenant** — eso lo hace `requireSession()`.

---

## 5. Estructura de archivos

```
src/
├── app/
│   ├── (auth)/                    # login, signup, forgot, reset
│   ├── (dashboard)/
│   │   ├── layout.tsx             # verifica sesión, banner trial, pasa datos al shell
│   │   └── dashboard/
│   │       ├── page.tsx           # KPIs del día
│   │       ├── ventas/
│   │       │   ├── page.tsx       # selector minorista/mayorista
│   │       │   ├── minorista/     # POS minorista (pos.tsx)
│   │       │   ├── mayorista/     # POS mayorista
│   │       │   └── historial/     # listado + detalle de ventas
│   │       ├── productos/         # listado, nuevo, [id] (editar)
│   │       ├── clientes/          # listado, nuevo, [id]
│   │       ├── cc/                # cuenta corriente, [clienteId]
│   │       ├── pedidos/           # pedidos a proveedores
│   │       ├── presupuestos/      # presupuestos PDF
│   │       ├── proveedores/       # proveedores y vínculos
│   │       ├── reportes/          # reportes de ventas
│   │       └── config/            # config del negocio + equipo
│   ├── onboarding/page.tsx        # primer acceso — elige plan y nombre
│   ├── planes/page.tsx            # pantalla de suscripción (cuando trial vence)
│   └── api/
│       ├── mp-oauth/callback/     # OAuth MP para cobros propios del negocio
│       ├── mp-webhook/            # webhooks de suscripción MP (Faro cobra al negocio)
│       └── pdf/                   # generación de PDF presupuesto y remito
│
├── components/
│   ├── dashboard-shell.tsx        # wrapper client: sidebar + mobile nav + command palette
│   ├── dashboard-sidebar.tsx      # sidebar desktop con nav por plan
│   ├── mobile-nav.tsx             # header + drawer mobile
│   ├── productos-list-client.tsx  # lista con búsqueda, filtros y acciones
│   ├── ajuste-stock-form.tsx      # entrada / salida / fijar / reiniciar a cero
│   ├── producto-form.tsx          # form edición/creación de producto
│   ├── pos-minorista.tsx          # POS con modal de peso para kg
│   └── ...
│
├── server/
│   ├── actions/                   # Server Actions (todos empiezan con requireSession)
│   │   ├── productos.ts           # CRUD + ajustarStock + fijarStock + toggleActivoProducto
│   │   ├── ventas.ts              # crearVenta, anularVenta, obtenerVenta
│   │   ├── clientes.ts
│   │   ├── pedidos.ts
│   │   ├── presupuestos.ts
│   │   ├── proveedores.ts
│   │   ├── categorias.ts
│   │   ├── cuenta-corriente.ts
│   │   ├── dashboard.ts           # KPIs agregados
│   │   ├── reportes.ts
│   │   ├── config.ts
│   │   ├── equipo.ts
│   │   ├── tenants.ts             # crearTenant (onboarding)
│   │   ├── suscripcion.ts         # crearSuscripcionMP, cancelarSuscripcion
│   │   └── mp-negocio.ts          # desconectarMP, getMPNegocioToken
│   ├── auth/session.ts
│   └── db/
│       ├── index.ts               # instancia drizzle
│       ├── tenant-context.ts      # byTenant() helper
│       └── schema/                # un archivo por entidad
│
└── lib/
    ├── planes.ts                  # definición de planes y precios
    ├── nav.ts                     # NAV_POR_PLAN — menú según plan
    ├── dolar.ts                   # fetch tipo MEP con revalidación
    ├── mp-url.ts                  # getUrlConectarMP() (sync, no puede ir en 'use server')
    ├── business-logic.ts
    └── utils.ts                   # cn(), formatARS(), formatKg()
```

---

## 6. Esquema de base de datos

### Tablas principales

**`tenants`** — un negocio por registro
```
id, nombre, slug, cuit
plan: 'servicios'|'market'|'food'|'balanza'
status: 'trial'|'activo'|'moroso'|'suspendido'|'cancelado'
trial_end, subscription_end, mp_subscription_id
mp_negocio_access_token, mp_negocio_refresh_token, mp_negocio_token_expiry, mp_negocio_user_id
zona_horaria, habilita_mayorista, habilita_minorista
direccion, telefono, email_negocio
```

**`users`** — espejo de auth.users de Supabase
```
id (= Supabase auth uid), email
```

**`users_tenants`** — membresías (por ahora 1 tenant por user)
```
user_id, tenant_id, rol: 'owner'|'admin'|'empleado'
```

**`productos`**
```
id, tenant_id, codigo, nombre, descripcion
categoria_id, grupo_variante_id
tipo_unidad: 'por_kg'|'por_unidad'
stock_actual (numeric 12,3), stock_minimo
costo_promedio, precio_mayorista, precio_minorista
activo: boolean
```

**`ventas`** (header)
```
id, tenant_id, numero (secuencial por tenant+canal)
canal: 'mayorista'|'minorista'
cliente_id, usuario_id, fecha
tipo_pago: 'contado'|'cuenta_corriente'
estado: 'pendiente'|'parcial'|'pagada'|'anulada'
subtotal, descuento, total, monto_pagado
factura_tipo, factura_punto_venta, factura_numero, cae (AFIP — aún no implementado)
```

**`ventas_lineas`** (detalle)
```
id, tenant_id, venta_id, producto_id (nullable)
descripcion, cantidad (numeric 12,3), precio_unitario, subtotal
```

**`clientes`**
```
id, tenant_id, razon_social, tipo: 'minorista'|'mayorista'|'ambos'
cuit, condicion_iva, es_consumidor_final, habilita_cuenta_corriente
telefono, email, direccion, notas
```

**`cuenta_corriente`** — saldos pendientes
```
id, tenant_id, cliente_id, venta_id
tipo: 'cargo'|'pago', monto, fecha, notas
```

**`presupuestos`**
```
id, tenant_id, cliente_id, numero, estado, validez
subtotal, descuento, total, notas
```

**`proveedores`** + **`producto_proveedores`** — vínculos producto-proveedor con precios de costo

**`pedidos`** — órdenes de compra a proveedores

**`categorias`** + **`grupos_variantes`** — organización del catálogo

---

## 7. Reglas de código importantes

### Server Actions
- Todos en `src/server/actions/`
- Siempre empiezan con `const session = await requireSession()`
- Siempre agregan `byTenant(session.tenantId, tabla)` en el WHERE
- Los que mutan datos llaman `revalidatePath()` al final
- **No pueden exportar funciones síncronas** — Turbopack las rechaza (por eso `getUrlConectarMP` está en `src/lib/mp-url.ts`)
- Cuando el server action necesita redirigir al cliente, **retornar `{ ok: true }` y hacer el redirect desde el cliente con `window.location.href`** — `redirect()` desde un server action llamado por un client component puede quedar colgado

### Multi-tenancy — nunca saltear
```typescript
// ✅ Correcto
db.select().from(productos).where(and(byTenant(session.tenantId, productos), eq(productos.id, id)))

// ❌ Nunca
db.select().from(productos).where(eq(productos.id, id))
```

### Componentes client vs server
- Las páginas (`page.tsx`) son Server Components que fetchean datos
- Los formularios y tablas interactivas son Client Components
- Si un componente necesita estado → `'use client'`
- **Nunca definir componentes dentro de otros componentes** — causa remount y pérdida de foco en inputs

### Formateo de moneda y peso
```typescript
formatARS(1234.5)    // → "$1.234,50"
formatKg(1.25)       // → "1,250 kg"
```

---

## 8. Flujo de suscripción (Mercado Pago)

### Faro cobra al negocio
1. Trial vence → usuario llega a `/planes`
2. Selecciona plan → llama `crearSuscripcionMP(planId)`
3. Server action crea un "preapproval" en MP API → retorna `init_point` URL
4. Usuario paga en MP → webhook llega a `/api/mp-webhook`
5. Webhook actualiza `tenant.status = 'activo'` y `plan`

### El negocio cobra a sus clientes
- El negocio conecta su cuenta de MP via OAuth en `/dashboard/config`
- Botón "Conectar con Mercado Pago" → redirige a `auth.mercadopago.com.ar/authorization`
- MP redirige a `/api/mp-oauth/callback` con el code
- Callback intercambia code por access_token → guarda en `tenants.mp_negocio_access_token`
- El POS puede generar cobros QR usando el token del negocio

---

## 9. Funcionalidades implementadas

### ✅ Completamente funcionales
- **Auth completa**: signup, login, logout, forgot password, reset password
- **Onboarding**: selección de plan + nombre del negocio + canales de venta
- **Dashboard**: KPIs del día (ventas hoy, semana, cobros pendientes, stock bajo) + últimas ventas
- **POS Minorista**: grilla de productos, filtro por tipo, modal de peso para kg, carrito, cliente, método de pago, registrar venta
- **POS Mayorista**: similar al minorista
- **Historial de ventas**: listado paginado + detalle + anulación
- **Productos**: listado con búsqueda, filtros (activos/inactivos/stock bajo), acciones por fila (editar, ajustar stock, toggle activo)
- **Editar producto**: form completo, ajuste de stock (entrada/salida/fijar/reiniciar a cero), vínculos a proveedores
- **Clientes**: CRUD completo, marca "consumidor final"
- **Cuenta corriente**: saldo por cliente, registrar pagos
- **Proveedores**: CRUD + vínculos a productos con precio de costo y markup
- **Pedidos**: órdenes de compra a proveedores
- **Presupuestos**: CRUD + PDF descargable + remito PDF
- **Reportes**: ventas por período, top productos, exportar CSV
- **Configuración**: datos del negocio, canales, info de suscripción, conectar/desconectar MP
- **Equipo**: invitar miembros (en desarrollo)
- **Navegación por plan**: cada plan ve solo su menú relevante
- **Banner de trial**: aparece los últimos 7 días antes de vencer
- **Suscripción MP**: flujo completo de pago
- **OAuth MP negocio**: conectar cuenta del negocio para cobros QR

### 🔜 Pronto (visible en menú pero no funcional)
- Cocina KDS (Gesto Food)
- Integración con balanza digital (Gesto Balanza)
- Facturación electrónica AFIP

---

## 10. Variables de entorno requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=            # service role, solo server
DATABASE_URL=                   # postgres:// directo para Drizzle

# App
NEXT_PUBLIC_APP_URL=https://faro-sistemas-gold.vercel.app

# Mercado Pago — suscripciones (Faro cobra a los negocios)
MP_ACCESS_TOKEN=
MP_CLIENT_SECRET=
MP_APP_ID=

# Mercado Pago — webhook secret para verificar notificaciones
MP_WEBHOOK_SECRET=
```

---

## 11. Scripts de utilidad

```bash
# Crear usuario demo con datos de ejemplo (carnicería, 9 productos)
npx dotenv-cli -e .env.local -- npx tsx scripts/crear-usuario-prueba.ts

# Crear cuenta con trial vencido (para ver la pantalla de planes)
npx dotenv-cli -e .env.local -- npx tsx scripts/crear-cuenta-planes.ts
```

Credenciales demo:
- `prueba@gesto.app` / `prueba1234` → dashboard completo con datos
- `planes@gesto.app` / `planes1234` → redirige a pantalla de planes

---

## 12. Pendientes conocidos

| Item | Descripción |
|------|-------------|
| Facturación AFIP | Estructura en DB lista (`cae`, `factura_numero`, etc.), no implementada |
| Migración MP negocio | Ejecutar en Supabase SQL Editor: `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mp_negocio_access_token TEXT, ...` (ver `scripts/migration-mp-negocio.sql`) |
| Mobile bottom nav | Archivo `mobile-bottom-nav.tsx` existe pero no está integrado en el shell |
| Categorías UI | Server actions y schema listos, no hay página de gestión de categorías |
| Precios por lista | Un solo precio mayorista/minorista por producto; sin lista de precios por cliente |
| Tests | Hay tests en `src/lib/__tests__/` para business-logic y utils, sin cobertura de actions |
| Balanza / KDS | Menú visible pero páginas no existen |

---

## 13. Convenciones de naming

- **Archivos**: kebab-case (`producto-form.tsx`, `ajuste-stock-form.tsx`)
- **Componentes**: PascalCase (`ProductoForm`, `AjusteStockForm`)
- **Server actions**: camelCase verbos en español (`listarProductos`, `crearVenta`, `ajustarStock`)
- **DB columns**: snake_case (`tenant_id`, `stock_actual`)
- **Drizzle types**: camelCase (`tenantId`, `stockActual`)
- **Idioma**: todo en español — labels, variables, comentarios, toasts
- **Moneda**: siempre pesos argentinos (ARS) con `formatARS()`; precios en DB como `numeric(12,2)`
- **Stock**: `numeric(12,3)` — permite kg con 3 decimales

---

## 14. Cómo se ejecuta localmente

```bash
cd C:\Users\Tomi\Documents\Software\faro-sistemas
npm install
npm run dev   # http://localhost:3000
```

El proyecto usa **Turbopack** (`next dev --turbopack`). Si hay errores de build con Turbopack revisar que todas las exports de archivos `'use server'` sean funciones async.
