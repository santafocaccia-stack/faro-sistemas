# Contexto — Precios vivos (anti-inflación)

> Doc de dominio para arrancar tibio sin releer todo el módulo. Actualizar al tocar
> precios. Fuente de verdad del estado del feature.

## Qué es
Feature anti-inflación: re-preciar en masa según un **margen objetivo** (recargo % sobre
el costo) con **redondeo opcional** a números "lindos", y avisar de productos con
**margen bajo**. Se activa por tenant con el flag `preciosVivos`.

## Estado actual (implementado)
- Margen objetivo a nivel negocio y opcional por producto.
- Actualización masiva de precios con redondeo activable (0/10/50/100).
- Alerta de margen bajo (productos por debajo del objetivo) + acción para llevarlos al objetivo.

## Mapa de archivos (rutas reales)
- Schema:
  - `src/server/db/schema/tenants.ts` → `preciosVivos` (bool, default false) + `margenObjetivo` (numeric 5,2 default '50')
  - `src/server/db/schema/productos.ts` → `margenObjetivo` (numeric 5,2, nullable; override por producto)
- Server actions: `src/server/actions/productos.ts`
  - `aplicarPreciosMasivo({ redondeo })` — redondeo válido: 10/50/100, si no → 0
  - `margenObjetivoNegocio(tenantId)` — helper, lee `tenants.margenObjetivo`
  - `productosMargenBajo()` — lista productos bajo el objetivo
  - `ajustarPreciosAlMargen({ redondeo })` — lleva los de margen bajo al objetivo (redondeo opcional)
- Config negocio: `src/server/actions/config.ts` + `src/components/config-form.tsx` (setear margen objetivo / activar preciosVivos)
- UI feature: `src/components/precios-vivos.tsx`
- UI alerta: `src/components/margen-bajo.tsx`
- Página: `src/app/(dashboard)/dashboard/productos/page.tsx`

## Pendiente / próximo paso
- Validar UX + QA del flujo de re-precios masivos (los 3 planes; revisar redondeo y bordes).
- Decidir si se expone como acción destacada en Productos.

## Cuidados
- `margenObjetivo` es numeric(5,2): manejar como string en Drizzle, no asumir number.
- Multi-tenant: toda query filtra por `tenant_id` (`byTenant()`), igual que el resto.
