# Perfil QA — Lógica de palabras y botones por plan

Objetivo: revisar que **cada texto, etiqueta y botón tenga sentido para el plan**
en el que aparece. No alcanza con que "funcione": no debe mencionar ni ofrecer
cosas que ese plan no tiene. Revisar siempre en **PC y celular**.

## Capacidades por plan (fuente de verdad: `src/lib/planes.ts`)

| Capacidad | servicios | market | food | balanza | prestamista (Préstamos) |
|---|:--:|:--:|:--:|:--:|:--:|
| POS / "Vender" / lector de códigos | ❌ | ✅ | ✅ | ✅ | ❌ |
| Productos / stock | ❌ | ✅ | ✅ | ✅ | ❌ |
| Presupuestos | ✅ | ❌ | ❌ | ❌ | ❌ |
| Agenda | ✅ | ❌ | ❌ | ❌ | ❌ |
| Préstamos / cartera | ❌ | ❌ | ❌ | ❌ | ✅ |
| Clientes | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cuenta corriente | ✅ | ✅ | ✅ | ✅ | (propia de préstamos) |
| Proveedores / Pedidos | ❌ | ✅ | ✅ | ✅ | ❌ |
| Reportes | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cocina (KDS) | ❌ | ❌ | ✅ | ❌ | ❌ |
| Balanza | ❌ | ❌ | ❌ | ✅ | ❌ |

## Reglas de coherencia (qué NO debe pasar)

1. **No mencionar POS / "punto de venta" / "vender" / "lector de códigos"** en
   servicios ni prestamista (ej: leyendas de roles en Equipo).
2. **No mostrar "top productos" ni stock** donde no hay productos (servicios,
   prestamista). Reportes debe adaptar la métrica al plan
   (ventas / cobros de presupuestos / cobranzas).
3. **No ofrecer "Presupuestos" ni "Agenda"** fuera de servicios.
4. **No ofrecer "Préstamos"** fuera de prestamista.
5. **Minorista / mayorista** solo tiene sentido donde hay POS.
6. **Roles (Equipo):** la descripción del empleado/admin debe reflejar lo que
   realmente puede hacer en ese plan (ver `descripcionEmpleado/Admin` en `nav.ts`).
7. **Acción principal de cada pantalla** debe nombrar la tarea real del plan
   ("Vender" en POS, "Nuevo presupuesto" en servicios, "Nuevo préstamo" en
   prestamista). Nada de etiquetas genéricas equivocadas.
8. **Guards:** entrar por URL directa a una ruta de otro plan debe dar 404.

## Checklist por pantalla (correr en PC y celular, los 5 planes)

- [ ] **Sidebar / bottom-nav**: solo ítems del plan. "Vender" solo si hay POS.
- [ ] **Inicio**: métricas/acciones del plan (sin ventas/stock en servicios/prestamista).
- [ ] **Equipo**: leyendas de roles coherentes con el plan.
- [ ] **Reportes**: métrica y paneles del plan; sin "top productos" si no hay productos.
- [ ] **Presupuestos** (servicios): autocompletado de descripciones, botón "Registrar cobro".
- [ ] **Agenda** (servicios): labels claros en fecha/hora y vencimientos.
- [ ] **Préstamos** (prestamista): cronograma, registrar pago, mora.
- [ ] **Productos** (POS): header sin solapamientos; categorías/variantes accesibles.
- [ ] **Planes**: Food y Balanza en "Próximamente" (sepia, sin precio, no contratables).
- [ ] **PDFs**: presupuesto/remito en A4 vertical, prolijos.
- [ ] **Tablas**: en celular no se cortan (se ven como tarjetas o scrollean).
- [ ] **Botones**: ninguno se sale de la pantalla en celular.
- [ ] **Login**: no queda en "Ingresando…"; credenciales válidas entran.

## Cómo correrlo

Usar el skill `/browse` (gstack) logueando cada cuenta demo (demo-servicios,
demo-market, demo-food, demo-balanza, demo-prestamista @gesto.app · `demo1234`)
en viewport desktop (1280px) y mobile (390px), recorriendo el checklist y
anotando cualquier texto/botón que no aplique al plan.
