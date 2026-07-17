# Reporte QA — Persona 01: Juan Pérez, técnico de refrigeración

- **Fecha**: 2026-07-17 · **Base**: faro-sistemas-staging.vercel.app · **Cuenta**: demo-servicios@gesto.app
- **Modo**: interactivo (cerebro Claude Code en sesión; el runner autónomo `runner.mjs` queda listo para cuando el CLI tenga auth)
- **Misión**: cargar clienta → presupuesto (visita $15.000 + reparación $80.000) → enviar → agendar visita → cobrar mitad efectivo/mitad a cuenta → ver reportes y saldo.

## Resumen del agente (como Juan)

Pude cargar a Marta, armar el presupuesto y cobrarlo, y el número del mes apareció al toque —
eso está muy bien. Pero NO pude hacer tres cosas centrales de mi trabajo real: mandarle el
presupuesto por WhatsApp (solo hay "Descargar PDF"), cobrar una seña (el botón cobra TODO de
una), y ver en la ficha de Marta lo que le hice (quedó vacía). La agenda encima me mostró la
visita en el día equivocado. ¿Le recomendaría Gesto a otro técnico? Todavía no: el flujo
existe pero se corta en las costuras. Con WhatsApp + seña + ficha del cliente conectada, sí.

## Bugs

- **[alta]** Agenda: días corridos por timezone. Hoy viernes 17/7 aparece como "Sábado 17"; el turno del sábado 18 cayó bajo "Domingo 18"; la semana arranca "Lunes 12" cuando el 12-jul-2026 fue domingo. Off-by-one UTC vs America/Argentina_Buenos_Aires en el armado de la semana.
- **[alta]** El combo de cliente en Nuevo presupuesto no sugiere clientes existentes (tipeando con teclas reales tampoco). El hint dice "elegilo de la lista" pero la lista nunca aparece → el presupuesto se crea con texto libre, sin `cliente_id`.
- **[alta — consecuencia]** Ficha del cliente vacía: Marta con $95.000 cobrados muestra "Sin compras registradas". Sin vínculo presupuesto↔cliente no hay historial, ni saldo, ni cta. corriente posible.
- **[media — infra]** El alias `faro-sistemas-staging.vercel.app` estaba clavado en un deploy del 25-jun (3 semanas viejo): reprodujo el bug de RLS ya arreglado y textos viejos. FIX aplicado: dominio asignado a la rama `staging` en Vercel (auto-alias en cada push).
- **[media — infra]** `ANTHROPIC_API_KEY` no existe en Vercel: el análisis IA de gastos (`src/lib/ia/analisis-mensual.ts:82`) no puede funcionar en prod.

## Fricciones

- **[alta]** "Registrar cobro" cobra el TOTAL con un solo click, sin diálogo de monto ni confirmación. Fácil de tocar por error (hay "Revertir cobro", pero el susto ya está).
- **[media]** Form de cliente en servicios pide "Tipo: Minorista/Mayorista/Ambos" y "Permite **vender** a crédito" — vocabulario de comercio, ruido para un prestador de servicios.
- **[baja]** Empty-state de Clientes: "asociarlos a **las ventas** y la cuenta corriente" (vocabulario market en plan servicios).
- **[baja]** Ficha de cliente: sección "**Compras** recientes" — en servicios serían "Trabajos" o "Presupuestos".
- **[baja]** Reportes: "1 cobro**s**" (plural hardcodeado).

## Faltantes

- **[alta]** Cobro parcial / seña en presupuestos. La operación más común del rubro ("me deja la mitad y el resto al terminar") es imposible hoy.
- **[alta]** Enviar presupuesto por WhatsApp (botón wa.me con link o PDF adjunto). Para PyMEs argentinas es EL canal; hoy solo existe "Descargar PDF" y el envío queda a mano del usuario.
- **[media]** El turno de agenda no se vincula a cliente ni a presupuesto (solo texto libre + dirección). Sin vínculo no puede haber "historial de visitas" del cliente ni recordatorios.

## Mejoras

- **[baja]** Al aprobar un presupuesto, ofrecer "¿Agendar la visita?" (hoy son dos flujos separados que el usuario tiene que conectar mentalmente).
- **[baja]** Recibo de cobro: ofrecer también compartir por WhatsApp, no solo descargar.

## Lo que funcionó bien

Login, alta de cliente (toast claro), creación de presupuesto (copy de servicios excelente:
"tarea o mano de obra"), numeración #00001, estados Borrador→Aprobado→Cobrado, PDF y recibo
descargables, revertir cobro, KPIs de inicio y reportes actualizados al instante, RLS fix
verificado (crear presupuesto ya no da error de Server Components).

## Verificación pendiente

- Contenido del PDF del presupuesto y del recibo (no se inspeccionó el binario).
- Correr las personas 02 (plomero: pago express sin presupuesto) y 03 (profe: recurrencia + deudores).
