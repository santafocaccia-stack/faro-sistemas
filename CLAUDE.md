# Faro Sistemas — Contexto para Claude Code

> **⚠️ Antes de tocar Next.js:** leé `AGENTS.md` en la raíz. Next.js 15 tiene breaking changes vs versiones anteriores; mirá `node_modules/next/dist/docs/` si vas a tocar APIs del framework.

---

## Qué es este proyecto

**Faro Sistemas** es una empresa de software vertical para PyMEs argentinas.
Este repositorio es el **producto base multi-tenant SaaS** sobre el que se construye cada vertical (carnicería primero, peluquería/restaurant/etc. después).

El primer vertical (carnicería) integra **mayorista + minorista en un solo sistema**:
- Mayorista: ventas a otros negocios, cuenta corriente, boleta/factura
- Minorista: ventas al consumidor final por mostrador, ticket, efectivo/tarjeta
- Stock compartido entre ambos canales
- Listas de precios diferenciadas por canal/cliente

## Decisiones técnicas cerradas

- **Frontend + Backend:** Next.js 15 (App Router) + TypeScript estricto
- **UI:** Tailwind CSS + shadcn/ui (estilo `new-york`, baseColor `neutral`)
- **DB:** PostgreSQL + Drizzle ORM (sin Prisma)
- **Auth:** Supabase Auth (mail + pass + magic link)
- **Multi-tenancy:** single DB, schema compartido, `tenant_id` en cada tabla, Postgres RLS
- **Pagos:** Mercado Pago Suscripciones
- **AFIP:** Tusfacturas.app (web service tercerizado)
- **Email:** Resend
- **Hosting:** Vercel (front+API) + Hetzner CX22 (DB Postgres)
- **Geografía:** Argentina solamente (al inicio)

## Stack — comandos básicos

```bash
npm run dev          # dev server con Turbopack
npm run build        # build production
npm run start        # serve build
npm run lint         # ESLint

# Drizzle
npx drizzle-kit generate   # generar migration nueva
npx drizzle-kit migrate    # aplicar migrations
npx drizzle-kit studio     # abrir UI de la DB
```

## Convenciones de código

### Estilo
- **TypeScript estricto.** `any` está prohibido salvo justificación explícita en comentario.
- **Funciones puras siempre que se pueda.** Side effects bien marcados (server actions, mutations).
- **Imports absolutos** con alias `@/` (configurado en `tsconfig.json`).
- **Naming:** archivos `kebab-case.ts`, componentes `PascalCase.tsx`, funciones `camelCase`, types/interfaces `PascalCase`.
- **Idioma:** comentarios y nombres de variables/funciones en **español**, identificadores técnicos (HTTP, SQL, etc.) en inglés.

### Componentes
- Server Components por defecto.
- `'use client'` solo cuando se necesita interactividad real.
- Components en `src/components/ui/` son los de shadcn (no editar directo, regenerar con la CLI).
- Components de negocio en `src/components/[dominio]/`.

### Server actions
- Validación de input con **Zod** siempre.
- Verificar `tenant_id` del usuario en cada query — **nunca** consultar sin filtrar por tenant.
- Errores tipados, no `throw` con strings.

### Multi-tenant — REGLA NO NEGOCIABLE
> **Toda query a la DB debe filtrarse por `tenant_id` del usuario autenticado.**
> Quien no respete esto introduce un bug crítico de seguridad.
> Postgres RLS es la red de seguridad, pero el código de aplicación tiene que filtrar también.

## Estructura del proyecto

```
faro-sistemas/
├── src/
│   ├── app/                    # Next.js App Router routes
│   │   ├── (auth)/             # Rutas públicas: login, signup
│   │   ├── (app)/              # Rutas protegidas (con tenant)
│   │   └── (admin)/            # Panel super-admin (gestión de tenants)
│   ├── components/
│   │   ├── ui/                 # shadcn components
│   │   └── [dominio]/          # carniceria/, ventas/, clientes/, etc.
│   ├── lib/                    # Utilidades genéricas (cn, formatters)
│   │   └── supabase/           # Clientes Supabase (browser/server)
│   └── server/                 # Solo server-side
│       ├── db/                 # Drizzle schema + queries
│       │   └── schema/         # Un archivo por dominio
│       └── auth/               # Helpers de auth
├── drizzle/                    # Migrations generadas
├── docs/                       # ADRs (Architecture Decision Records)
├── public/
├── .env.example
├── AGENTS.md                   # Warning de Next.js 15
├── CLAUDE.md                   # ← este archivo
└── ARCHITECTURE.md             # Decisiones técnicas profundas
```

## Variables de entorno necesarias

Ver `.env.example`. Mínimo para arrancar:
- `DATABASE_URL` — Postgres connection string
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — solo server-side

## Brand

- **Estilo:** profesional, sobrio, argentino sin folclore. Inspiración: Stripe (limpio), Linear (minimalista) — pero más cálido.
- **Tipografías:** Inter (body) + [display por confirmar]
- **Colores:** [pendientes — diseñador externo]
- **Tono UX:** breve, lenguaje del cliente, no del programador. "Te quedaste sin un corte" no "stock = 0".

## Documentación complementaria

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — decisiones técnicas profundas
- [`docs/adr/`](./docs/adr/) — registro de decisiones arquitectónicas (cuando empiecen)
- **Plan de negocio:** `C:\Users\Tomi\Documents\Software\Empresa\` (vault Obsidian)
- **Sistema legacy** del que migramos features: `C:\Users\Tomi\Documents\Software\sistema-mayorista-final` (Electron, single-tenant — usar solo como spec)

## Información del autor

- **Email:** tomasemanueldesousa@gmail.com
- **Nombre:** Tomás de Sousa
- **GitHub username:** [PENDIENTE — agregar cuando se confirme]

## Para Claude (futuras sesiones)

Si esta es una sesión nueva:
1. **Leé `AGENTS.md` y este archivo enteros** para entender el proyecto.
2. **Leé `ARCHITECTURE.md`** para decisiones técnicas profundas.
3. **Mirá la estructura de `src/`** para ubicar código.
4. **Si vas a tocar la DB:** revisá `src/server/db/schema/` antes de proponer cambios.
5. **Si vas a hacer cambios grandes:** considerá crear un ADR en `docs/adr/`.
6. **Reglas no negociables:**
   - Multi-tenancy: `tenant_id` en toda query
   - TypeScript estricto, no `any`
   - Server-side validation con Zod
   - Comentarios y nombres en español
