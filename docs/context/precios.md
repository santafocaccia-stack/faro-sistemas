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
- Decidir si se expone como acción destacada en Productos.

## Hardening de revisión (2026-06-02) — ✅ corregido
Fix aplicado (typecheck verde) en `productos.ts`, `config.ts`, `schemas/index.ts`, `margen-bajo.tsx`:
1. ✅ **Flag `preciosVivos` chequeado server-side** en `aplicarPreciosMasivo` y
   `ajustarPreciosAlMargen` (helper `preciosVivosActivo`): si está apagado → `{ok:false}`.
2. ✅ **Zod en las 3 actions**: `aplicarPreciosMasivoSchema`, `ajustarPreciosAlMargenSchema`
   (pct finito -90..1000, redondeo ∈ {0,10,50,100}). Input inválido → `formatZodError`.
3. ✅ **`margenObjetivo` validado** con `margenObjetivoSchema` (coerce, 0..999.99, sin NaN)
   en `actualizarConfig`.
4. ✅ **Confirm en "Ajustar al objetivo"** (`margen-bajo.tsx` con `ConfirmDialog`).
5. ✅ **Doble `requireAdmin` eliminado**: `productosMargenBajo` delega en `calcularMargenBajo(tenantId)`.

🟡 Pendiente menor (no urgente): contador `actualizados` incluye productos precio 0 que
no cambian; `margenObjetivoNegocio` silencia tenant-not-found (default 50); update masivo
sin límite de filas (deuda, no bug).

## QA en vivo (2026-06-02, producción, tenant demo-market) — parcial
✅ Verificado en vivo: login OK, /dashboard/productos carga sin errores de consola,
Precios vivos activo (botón "Actualizar precios" + alerta de margen bajo presentes).
✅ **ConfirmDialog del fix funciona**: "Ajustar al objetivo" abre diálogo con título
e interpolación correctos ("...redondeando a $100. Esta acción modifica precios en masa.",
singular/plural OK) y botones Cancelar / "Sí, ajustar". Cancelar cierra sin ejecutar.
✅ **Re-precio real ejecutado end-to-end** (demo-market): "Ajustar al objetivo" sobre
"Cigarrillos Marlboro" (recargo 44.4%→50%): minorista $2.600 → $2.700 (redondeo $100),
mayorista intacto ($2.200), toast "1 precios ajustados", alerta de margen bajo limpiada
(0 productos), sin errores de consola. `ajustarPreciosAlMargen` confirmado en producción.
✅ **Modal masivo verificado end-to-end** (demo-market): "Actualizar precios" +7% redondeo
$100 sobre 7 productos → Marlboro minorista $2.700→$2.900 (2889→2900) y mayorista
$2.200→$2.400 (2354→2400). Toast "7 precios actualizados". Redondeo correcto.
Ambos flujos (margen bajo y masivo) ahora piden confirmación con `ConfirmDialog`.
⚠️ Falta (no bloqueante): test de validación Zod con input inválido en la UI del masivo
y pasada cross-plan (servicios/prestamista). Cubierto a nivel código por typecheck + revisión.
Nota: daemon headless de gstack inestable en Windows (se resetea entre pasos).

✅ Ya estaba OK: multi-tenant (`byTenant` en SELECT y UPDATE), `requireAdmin` en las 3,
costo≤0 salteado, numeric como string (`toFixed(2)`), redondeo sanitizado, transacciones.

## Cuidados
- `margenObjetivo` es numeric(5,2): manejar como string en Drizzle, no asumir number.
- Multi-tenant: toda query filtra por `tenant_id` (`byTenant()`), igual que el resto.
