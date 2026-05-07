# Architecture · Faro Sistemas

> Decisiones técnicas profundas. Este documento explica el "por qué" de cada elección.
> Cambios mayores deben registrarse como ADR en `docs/adr/`.

---

## Principios rectores

1. **Boring tech wins.** Postgres > NoSQL exótico, Next.js > framework del mes, fetch > 5 librerías HTTP.
2. **Type-safety end-to-end.** TypeScript + Drizzle + Zod = el compilador atrapa lo que el QA no.
3. **Server-first.** Server Components, Server Actions. Client solo donde la interacción lo requiere.
4. **Multi-tenant safety por defecto.** Cualquier query sin `tenant_id` es bug de seguridad.
5. **Optimizar para fundador part-time.** Toda decisión que ahorre 5 horas por mes vale más que la "más correcta teóricamente".

---

## Stack técnico

### Frontend & Backend — Next.js 15 (App Router)

**Por qué Next.js:**
- Un solo lenguaje (TypeScript) para front y back
- Server Components reducen JS enviado al browser
- Server Actions eliminan boilerplate de API routes
- Deploy a Vercel es 1 comando
- Comunidad gigantesca (cualquier problema ya está resuelto en Stack Overflow)

**Por qué App Router (no Pages):**
- Es el futuro de Next.js
- Server Components + Streaming + nested layouts → mejor UX
- Router de archivos más expresivo (route groups, intercepting routes)

**Trade-off:** documentación más nueva, breaking changes vs versiones anteriores. Mitigación: leer `AGENTS.md` y `node_modules/next/dist/docs/`.

### TypeScript estricto

`tsconfig.json` con `"strict": true`. Ver también:
- `noUncheckedIndexedAccess: true` — `arr[0]` devuelve `T | undefined`, no `T`
- `noImplicitOverride: true` — métodos de clase con `override` explícito
- `noFallthroughCasesInSwitch: true`

**Por qué:** un solo dev mantiene esto. Sin TS estricto, los bugs llegan a producción y el cliente los reporta.

### UI — Tailwind + shadcn/ui

**Por qué Tailwind:**
- Cero CSS files dispersos
- Cohesión visual forzada por design tokens
- Estandar de la industria, hiring fácil

**Por qué shadcn/ui (no MUI / Mantine / Chakra):**
- No es una librería que instalás — son componentes que **copiás a tu repo**
- Total control sobre el código, cero deuda con upstream
- Estilo "new-york" + neutral + cssVariables = base sólida y tunear-able
- Accesibilidad de primera (Radix primitives debajo)

### Base de datos — PostgreSQL + Drizzle

**Por qué Postgres:**
- Maduro, confiable, todo el mundo lo soporta
- JSON, full-text search, RLS — todo built-in
- Free hasta volúmenes que no vamos a alcanzar en años
- Self-hosting trivial en cualquier VPS

**Por qué Drizzle (no Prisma):**
- Type-safe sin runtime overhead
- Queries en SQL legible (vs Prisma's DSL opaca)
- 10× más rápido que Prisma en cold-start (importante en Vercel)
- Migrations transparentes (archivos SQL versionados)
- Sin generador externo bloqueando builds

**Trade-off:** Drizzle tiene menos tooling visual que Prisma Studio. Mitigación: `drizzle-kit studio` cumple para 90% de casos.

### Auth — Supabase Auth

**Por qué Supabase Auth:**
- Solucionado: signup, login, magic link, OAuth, password reset, email verification, MFA
- 50.000 MAU gratis (más que suficiente para los primeros años)
- API simple, SDK oficial bueno
- Cookies seguras manejadas por la lib

**Por qué no NextAuth/Auth.js:**
- Muy boilerplate para arrancar
- Bugs frecuentes en versiones nuevas
- Hay que mantener providers manualmente

**Por qué no Clerk:**
- Caro a partir del segundo mes de uso real
- Vendor lock-in fuerte

**Trade-off:** Supabase agrega un servicio externo más en la stack. Mitigación: si en el futuro queremos migrar, los datos están en una DB Postgres normal y portable.

### Pagos — Mercado Pago

No hay alternativa real en Argentina para débito automático recurrente. Stripe no opera localmente para suscripciones argentinas.

### Facturación electrónica — Tusfacturas.app

Implementar el WS de AFIP desde cero es un dolor (certificados digitales, formatos crípticos, errores en español malo). Tusfacturas cuesta ~ARS $10k/mes y se ocupa de todo.

Cuando volumen lo justifique (probablemente >100 clientes), evaluar bajarlo en casa.

### Hosting

**Frontend + API en Vercel.** Free tier alcanza para los primeros 10-20 clientes. Después se evalúa: o pagamos plan ($20/mes) o nos vamos a un VPS con Caddy + Bun.

**DB en Hetzner CX22 (Falkenstein, EU).** USD $5/mes. Primero un Postgres self-hosted; cuando necesite escala se migra a managed (Supabase / Neon).

**Por qué EU y no Argentina:** mejor uptime, mejor latencia internacional cuando expandamos, costos en EUR estables. La latencia AR-EU es ~250ms — aceptable para SaaS de gestión (no juegos).

---

## Multi-tenancy

### Estrategia: shared database, shared schema, `tenant_id` per row

```
┌──────────────────────────────────────────────┐
│ tenants                                       │
│ ┌──────┬──────────────┬──────────────┐       │
│ │ id   │ nombre       │ plan         │       │
│ │ uuid │ "Carnicería… │ "pro"        │       │
│ └──────┴──────────────┴──────────────┘       │
│                                               │
│ users                                         │
│ ┌──────┬──────┬───────────────┐              │
│ │ id   │ email│ tenant_id (FK)│              │
│ └──────┴──────┴───────────────┘              │
│                                               │
│ clientes                                      │
│ ┌──────┬───────────┬───────────────┐         │
│ │ id   │ nombre    │ tenant_id (FK)│         │
│ └──────┴───────────┴───────────────┘         │
│                                               │
│ ventas                                        │
│ ┌──────┬───────────┬──────────────┬─────────┐│
│ │ id   │ monto     │ cliente_id   │tenant_id││
│ └──────┴───────────┴──────────────┴─────────┘│
└──────────────────────────────────────────────┘
```

### Por qué este modelo (vs schema-per-tenant o database-per-tenant):

| Modelo | Costo infra | Performance | Aislamiento | Migrations | Mejor para |
|---|---|---|---|---|---|
| **Shared schema (elegido)** | Bajísimo | Bueno | Lógico (RLS) | Una sola | SaaS escalable |
| Schema-per-tenant | Medio | Bueno | Fuerte | N migrations | Compliance estricto |
| DB-per-tenant | Alto | Bueno | Total | N DBs | Enterprise / regulado |

Con shared schema:
- Una sola DB → backups simples, queries cross-tenant para métricas internas (con cuidado)
- Postgres RLS forzando filtros a nivel DB → red de seguridad
- Migrations en un solo lugar
- Onboarding trivial: insertar fila en `tenants`, listo

### Cómo se implementa

1. **Cada tabla tiene `tenant_id UUID NOT NULL` con FK a `tenants(id)`.**
2. **Indice compuesto** `(tenant_id, ...otros)` en cualquier columna usada en WHERE.
3. **Postgres RLS:** policy que filtra por `current_setting('app.tenant_id')`.
4. **Middleware de Next.js:** lee el tenant del JWT de Supabase, lo setea en la sesión.
5. **Helper `db()`:** wrapper que setea `app.tenant_id` antes de cada query.
6. **Tests específicos:** validar que ningún endpoint filtre datos cross-tenant.

### Roles dentro de un tenant

```
tenant
  ├── owner     (1)   — dueño del negocio, todo permiso
  ├── admin     (N)   — administradores, casi todo permiso
  └── empleado  (N)   — empleados, permisos limitados (no borrar, no exportar)
```

Tabla `users_tenants(user_id, tenant_id, rol)` permite que una persona tenga roles distintos en distintos tenants (importante: un contador podría tener acceso a varios negocios).

---

## Modelo de datos para mayorista + minorista (carnicería)

### Concepto clave: cada venta tiene **canal**

```
ventas
  - id
  - tenant_id
  - canal: enum('mayorista', 'minorista')
  - cliente_id (nullable: minorista puede ser walk-in sin cliente registrado)
  - fecha
  - tipo_pago: enum('contado', 'cuenta_corriente')
  - estado: enum('pendiente', 'pagada', 'parcial', 'anulada')
  - total
  - canal-específico: ticket_numero (minorista) | boleta_numero (mayorista)
```

### Stock compartido

```
productos
  - id
  - tenant_id
  - nombre
  - tipo: enum('por_kg', 'por_unidad')
  - stock_kg (decimal) o stock_unidades (int)
  - costo_promedio
  - activo

precios
  - producto_id
  - canal: enum('mayorista', 'minorista')
  - precio
  - vigencia_desde
```

### Clientes

```
clientes
  - id
  - tenant_id
  - tipo: enum('mayorista', 'minorista', 'ambos')
  - cuenta_corriente: bool (solo mayoristas)
  - limite_credito (nullable)
  - saldo_actual (calculado, cacheado)
  - cuit, condicion_iva, etc. (datos AFIP)
```

### Decisiones pendientes

- [ ] ¿Cómo manejamos minoristas walk-in (sin registro)? Probablemente: cliente especial "Consumidor Final" por tenant, todas las ventas anónimas se atribuyen ahí.
- [ ] ¿Listas de precios por cliente puntual (no solo por canal)? Sí — algunos mayoristas tienen precios negociados especiales.
- [ ] ¿Multi-sucursal en v1 o v2? Probablemente v2 — agrega complejidad.
- [ ] ¿Lotes / vencimientos para carnicería? La carne tiene fecha de vencimiento. Quizás opcional por tenant.

---

## Performance budget

- **First paint:** <1s en 4G
- **TTI:** <3s
- **Server response (p95):** <300ms
- **Bundle JS inicial:** <200kb gzipped
- **DB queries por request:** <5

Si un cambio rompe alguno de estos, hay que justificarlo o revertir.

---

## Seguridad — checklist mínimo

- [ ] HTTPS forzado (Vercel default)
- [ ] CSP headers configurados
- [ ] Cookies httpOnly + sameSite=strict
- [ ] Rate limiting en login (Supabase + middleware adicional)
- [ ] Validación Zod en todo input
- [ ] No exposición de errores internos al cliente
- [ ] RLS en todas las tablas con `tenant_id`
- [ ] Logs server-side sin datos sensibles
- [ ] Secretos en env vars, nunca en código
- [ ] Audit log básico de acciones críticas (alta de tenant, baja, cambio de plan)

---

## Testing strategy

- **Unit (Vitest):** funciones puras, validators Zod, utilities
- **Integration:** server actions con DB en memoria (testcontainers o pg-mem)
- **E2E (Playwright):** flujos críticos (signup, primera venta, cobro)
- **Manual:** todo lo demás hasta que tengamos volumen

**Coverage objetivo:** no medimos % por arbitrario. Sí: el camino de pago debe estar testeado E2E.

---

## CI/CD

- GitHub Actions corriendo: `lint`, `typecheck`, `test`, `build`
- Vercel desploya automático en merge a `main`
- Branch protection: no merge a `main` sin checks verdes

---

## Roadmap técnico (alto nivel)

### Mes 1 — Núcleo
- Auth + tenants + multi-user
- Layout base + navegación
- Panel super-admin para alta de tenants

### Mes 2 — Carnicería v1
- Catálogo de productos
- Clientes (mayoristas + minoristas)
- Ventas (canal mayorista + minorista)
- Cuenta corriente
- Boleta + ticket imprimibles

### Mes 3 — Cobranza y AFIP
- Mercado Pago Suscripciones (cobro nuestro a los tenants)
- Tusfacturas integration (que cada tenant facture a sus clientes)

### Mes 4+ — Pulido y siguiente vertical

---

## Changelog
- 2026-05-03 — Versión inicial
