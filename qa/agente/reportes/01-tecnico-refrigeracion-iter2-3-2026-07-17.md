# Reporte QA — Persona 01 Juan Pérez · Iteraciones 2 y 3 (post-fixes)

- **Fecha**: 2026-07-17 (noche) · **Base**: faro-sistemas-staging.vercel.app · demo-servicios
- **Contexto**: loop de 3 iteraciones "arreglar todo → Juan re-analiza". Iteración 1 = reporte anterior.

## Iteración 2 — verificación de los fixes

| Hallazgo de iter 1 | Resultado |
|---|---|
| Agenda con días corridos (TZ) | ✅ Semana 13→19 correcta, hoy viernes 17 en su lugar, turno bajo Sábado 18 |
| Combo cliente sin sugerencias | ✅ Autocomplete propio sugiere a Marta al tipear "Mar"; matching sin tildes |
| Ficha del cliente vacía | ✅ "Trabajos recientes" muestra los presupuestos vinculados |
| Sin cobro parcial | ✅ Diálogo con monto+método: seña de $20.000 → badge "Señado", saldo visible, segundo pago completa a COBRADO; "Pagos registrados" lista ambos |
| Cobro en 1 click sin confirmar | ✅ Ahora siempre pasa por el diálogo con monto y botón "Cobrar $X" |
| Sin WhatsApp | ✅ Botón en el detalle (wa.me con resumen; directo al chat si hay teléfono) |
| Turno sin cliente | ✅ Select de cliente (autocompleta dirección) + prefill por URL |
| Aprobar → agendar | ✅ Toast "¿Agendamos la visita?" con acción que abre la agenda prefilleada |
| Vocabulario market en servicios | ✅ Sin Minorista/Mayorista, copy de cta cte y empty-states adaptados, "1 cobro" |
| Reportes por pago | ✅ "Cobrado este mes" suma cada pago individual ($135.000 / 3 cobros) |

**Hallazgos NUEVOS de iter 2** (ambos corregidos en el mismo ciclo):
- **[media] Fechas server-side en UTC**: a las 22hs AR el presupuesto decía "sábado 18" siendo viernes 17 (misma raíz que la agenda, en otra capa). Fix: `formatFechaAR()` en lib/fechas aplicado a detalle/lista de presupuestos, pagos y ficha.
- **[baja] Toast de agendar se desvanecía rápido** → duración 12s.

## Iteración 3 — regresión final

- Fecha del presupuesto: "viernes, 17 de julio" ✅
- Cliente por texto libre ("Carlos Gomez"): aviso claro "se guarda como nombre suelto" ✅
- Trabajo express: crear → cobrar total → recibo, en 2 clicks (sirve para el caso plomero) ✅
- KPIs consistentes: $160.000 / 4 cobros = 95.000 + 20.000 + 20.000 + 25.000 ✅
- Sin errores de consola ni HTTP 5xx en toda la corrida ✅

**Veredicto de Juan (iter 3)**: "Ahora sí se lo recomendaría a otro técnico: presupuesto,
seña, saldo, WhatsApp y la ficha del cliente cierran el círculo del laburo real."

## Deuda anotada (no bloqueante)

- `toLocaleDateString` server-side sin TZ AR sigue en pantallas de OTROS planes
  (boletas, pedidos, préstamos) — aplicar `formatFechaAR` cuando se auditen esos planes.
- `ANTHROPIC_API_KEY` sigue faltando en Vercel (análisis IA de gastos muerto en prod) — acción del usuario.
- El presupuesto #00001 (texto libre de iter 1) no aparece en la ficha de Marta: correcto
  por diseño, pero podría ofrecerse "vincular a cliente" al editar.
- El PDF/recibo no se inspeccionó por dentro (binario).
