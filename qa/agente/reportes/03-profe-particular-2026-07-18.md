# Reporte QA — Persona 03: Lucía Fernández, profe particular · 3 iteraciones

- **Fecha**: 2026-07-18 · **Base**: faro-sistemas-staging.vercel.app · demo-servicios
- **Misión**: 3 alumnos con clase semanal fija, cobro mensual (uno completo, uno a medias),
  reprogramar una clase cancelada, cierre de mes (quién debe / cuánto facturé).

## Iteración 1 — hallazgos

- **[alta/faltante]** Clases recurrentes: cargó las 3 clases una por una y la semana
  siguiente habría que repetir todo. → FIX: select "Se repite: cada semana ×4/×8/×12"
  en el form de turno (crea los N turnos de una).
- **[media/faltante]** No se podía editar/reprogramar un turno: la clase cancelada de
  Valentina hubo que borrarla y recrearla. → FIX: lápiz en la tarjeta → form prefillado
  → guardar cambios (usa `actualizarTurno`, que ya existía sin UI).
- **[media]** Eliminar turno era un click de hover SIN confirmación. → FIX: ConfirmDialog.
- **[media]** La lista de presupuestos mostraba "APROBADO $60.000" sin distinguir señado
  ni saldo: para saber quién debe cuánto había que entrar a cada uno. → FIX: badge
  "SEÑADO · RESTA $X" en lista (desktop y mobile) + fecha desktop con TZ AR.
- **[baja]** Toast de aprobar decía "¿Agendamos la **visita**?" (jerga de oficios). → "¿Lo agendamos?"

## Iteración 2 — verificación (todo ✓)

- "SEÑADO · RESTA $30.000" visible en la lista para Tomás (y Beatriz $140.000).
- Reprogramación con lápiz: clase de Valentina movida de 17:00 → 18:00 sin borrar nada.
- Repetición ×4: clase de Sofía creada los lunes 27/7, 3/8, 10/8 y 17/8 — la 5ª semana
  queda vacía (corte exacto).
- Confirmación de borrado: aparece el diálogo con el nombre del turno; Cancelar cancela.
- Flujos previos intactos: boleta de Sofía $60.000 (transferencia) vinculada, seña de
  Tomás $30.000, KPIs exactos ($375.000 / 8 cobros; por cobrar $170.000).

## Iteración 3 — regresión final (limpia)

KPIs consistentes, reportes sin errores, cero errores de consola/red en toda la corrida.

**Veredicto de Lucía**: "Con la clase semanal que se repite y el 'resta $X' en la lista ya
me reemplaza la planilla. Contra Calendly me falta que el alumno confirme solo y algún
recordatorio automático — pero para cobrar y saber quién me debe, esto es más simple."

## Deuda anotada (no bloqueante)

- Recurrencia v2: los N turnos creados no quedan vinculados entre sí (editar uno no ofrece
  "editar toda la serie"). Suficiente para v1; anotar si molesta en beta.
- Recordatorios al cliente (WhatsApp antes del turno) — pedido implícito de este rubro;
  conecta con el backlog de "Agenda + alertas 12h/1h".
- Labels del form de turno ("Trabajo a realizar", "Dirección del trabajo") suenan a oficios;
  tolerable, pero si se suma un rubro "clases/consultorios" conviene vocabulario por rubro.
