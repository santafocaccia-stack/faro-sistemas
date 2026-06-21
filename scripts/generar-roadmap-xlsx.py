# -*- coding: utf-8 -*-
"""
Genera/regenera el roadmap de Gesto en Excel (roadmap-gesto.xlsx).
Fuente de verdad de tareas: lista TAREAS de abajo. Para actualizar el estado de
una tarea, editar acá y volver a correr, o editar el .xlsx directamente.
"""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule

OUT = r"C:\Users\Tomi\Documents\Software\faro-sistemas\roadmap-gesto.xlsx"
HOY = "2026-06-20"

# ---- Paleta "Brasas" ----
NARANJA   = "C2410C"  # acento
NARANJA_2 = "EA580C"
OSCURO    = "1C1917"
HEADER_BG = "1C1917"
HEADER_FG = "FFFFFF"
VERDE     = "DCFCE7"  # hecho
AMARILLO  = "FEF9C3"  # en progreso
GRIS      = "F1F5F9"  # pendiente
ZEBRA     = "FAFAF9"

# (categoria, tarea, prioridad, estado, notas)
# estado: "Hecho" | "En progreso" | "Pendiente"
TAREAS = [
    # Infraestructura
    ("Infraestructura", "Stack Next.js 16 App Router + TypeScript strict + Turbopack", "—", "Hecho", ""),
    ("Infraestructura", "Tailwind v4 + shadcn/ui + Design System Brasas", "—", "Hecho", ""),
    ("Infraestructura", "Drizzle ORM + Supabase Postgres", "—", "Hecho", ""),
    ("Infraestructura", "Supabase Auth SSR + middleware de sesión", "—", "Hecho", ""),
    ("Infraestructura", "Framer Motion + command palette (cmdk)", "—", "Hecho", ""),

    # Base de datos
    ("Base de datos", "Schema multi-tenant (tenants, users, productos, clientes, ventas, pagos, CC)", "—", "Hecho", "10 tablas (+ presupuestos)"),
    ("Base de datos", "Migraciones aplicadas en Supabase", "—", "Hecho", ""),
    ("Base de datos", "RLS multi-tenant (16 políticas, script defensivo)", "—", "Hecho", "byTenant() + RLS como red de seguridad"),

    # Auth
    ("Auth", "Login / Signup / Onboarding (crear tenant)", "—", "Hecho", ""),
    ("Auth", "Recuperar contraseña (forgot + reset)", "—", "Hecho", ""),
    ("Auth", "Auth callback PKCE + token_hash", "—", "Hecho", ""),

    # Productos
    ("Productos", "CRUD productos (stock kg/unidad, precios may/min)", "—", "Hecho", "Title Case, inputs vacíos no 0"),
    ("Productos", "Carga rápida (scan → nombre → precio → siguiente)", "—", "Hecho", "/productos/carga-rapida"),
    ("Productos", "Importación CSV con preview y validación", "—", "Hecho", "lotes de 100, crea categorías"),
    ("Productos", "Categorías (CRUD + filtro en lista y POS)", "—", "Hecho", ""),
    ("Productos", "Grupos de variantes + sugerencia asistida", "—", "Hecho", ""),
    ("Productos", "Código PLU (plan balanza)", "—", "Hecho", ""),
    ("Productos", "Precios vivos (anti-inflación: margen + actualización masiva)", "Alta", "En progreso", "Falta QA en vivo los 3 planes; ver docs/context/precios.md"),
    ("Productos", "Alertas de stock bajo (banner/email cuando stock ≤ mínimo)", "Media", "Pendiente", "El campo existe, no dispara nada"),
    ("Productos", "Precios especiales por cliente", "Media", "Pendiente", "Mayoristas con acuerdos puntuales"),

    # Clientes
    ("Clientes", "CRUD clientes + ficha con saldo CC", "—", "Hecho", "tipo, condición IVA, descuento"),

    # Ventas / POS
    ("Ventas / POS", "POS unificado mayorista + minorista (carrito Zustand)", "—", "Hecho", "split-screen"),
    ("Ventas / POS", "Scanner de código de barras (ZXing, cámara real)", "—", "Hecho", ""),
    ("Ventas / POS", "Métodos de pago (efectivo, transf, tarjeta, MP, cuenta corriente)", "—", "Hecho", ""),
    ("Ventas / POS", "Ticket 80mm + Remito A4 PDF (compartir / descargar)", "—", "Hecho", "@react-pdf/renderer"),
    ("Ventas / POS", "Atajos de teclado (F2 cobrar, Esc, Supr)", "—", "Hecho", ""),
    ("Ventas / POS", "Historial + detalle de venta (filtro por período)", "—", "Hecho", ""),
    ("Ventas / POS", "Descuentos en POS (% o $ por total)", "Media", "Pendiente", "Muy pedido en kioscos/carnicerías"),
    ("Ventas / POS", "Devoluciones / notas de crédito (reversar venta + ajuste stock)", "Media", "Pendiente", "Reversión de CC ya está hecha"),

    # Cuenta Corriente
    ("Cuenta Corriente", "Movimientos + registrar pago + saldo en tiempo real", "—", "Hecho", "registrarPago atómico FOR UPDATE"),
    ("Cuenta Corriente", "Reversión de movimientos (transacción atómica)", "—", "Hecho", "motivo obligatorio"),

    # Reportes
    ("Reportes", "KPIs por período + ranking top productos + métodos de pago", "—", "Hecho", "ventana de tiempo unificada"),
    ("Reportes", "Exportar a CSV", "—", "Hecho", ""),

    # Presupuestos
    ("Presupuestos", "CRUD + PDF + estados + numeración atómica", "—", "Hecho", "db.transaction"),
    ("Presupuestos", "Plantillas de servicios (guardar/listar/usar)", "—", "Hecho", ""),

    # Proveedores / Pedidos
    ("Proveedores / Pedidos", "CRUD proveedores (markup, selector de país)", "—", "Hecho", ""),
    ("Proveedores / Pedidos", "Pedidos a proveedor (WhatsApp + recepción con ajuste de stock)", "—", "Hecho", ""),

    # Configuración / Equipo
    ("Configuración / Equipo", "Datos fiscales + canales + conectar/desconectar Mercado Pago", "—", "Hecho", ""),
    ("Configuración / Equipo", "Equipo: invitar por email, editar rol, eliminar", "—", "Hecho", ""),
    ("Configuración / Equipo", "Control de acceso por rol (requireAdmin, route group)", "—", "Hecho", "empleado solo POS+Historial+Productos"),

    # UX / Diseño
    ("UX / Diseño", "Design System Brasas v2 (paleta cálida + grain + gradientes)", "—", "Hecho", ""),
    ("UX / Diseño", "Sidebar + mobile bottom nav con FAB Vender", "—", "Hecho", ""),
    ("UX / Diseño", "Skeleton loaders (7 rutas)", "—", "Hecho", ""),
    ("UX / Diseño", "Command palette ⌘K", "—", "Hecho", ""),
    ("UX / Diseño", "Dark / light toggle", "Baja", "Pendiente", ""),

    # Negocio SaaS / Suscripción
    ("Negocio SaaS", "4 planes + Mercado Pago preapproval + webhook activación/suspensión", "—", "Hecho", "src/lib/planes.ts"),
    ("Negocio SaaS", "Cobro por transferencia (panel admin + aviso cliente + comprobante por email)", "—", "Hecho", "Activación manual 1-click; /admin/suscripciones; emails salen al cargar RESEND_API_KEY"),
    ("Negocio SaaS", "Cobro automático MP/Mobbex (CUIT Monotributo + cuenta)", "Alta", "En progreso", "Bloqueado: falta CUIT + cuenta. Mientras tanto se cobra por transferencia"),
    ("Negocio SaaS", "Panel super-admin (gestionar tenants, métricas cross-tenant)", "Media", "En progreso", "Panel /admin/suscripciones operativo; faltan métricas cross-tenant"),
    ("Negocio SaaS", "Catálogo global cross-tenant", "Baja", "Pendiente", "Necesita OK explícito antes de implementar"),

    # Lanzamiento (bloqueantes)
    ("Lanzamiento (bloqueante)", "Dominio propio (ej: usegesto.app)", "Alta", "Pendiente", "URL actual no es presentable"),
    ("Lanzamiento (bloqueante)", "SMTP con Resend (invitación, bienvenida, reset con branding)", "Alta", "Pendiente", "Cron listo; falta RESEND_API_KEY en Vercel (rotar la vieja)"),
    ("Lanzamiento (bloqueante)", "Landing page pública (hoy / redirige al dashboard)", "Alta", "Pendiente", ""),
    ("Lanzamiento (bloqueante)", "PWA manifest + iconos (192/512, apple-touch-icon)", "Alta", "Pendiente", "POS se usa en tablet/celular"),
    ("Lanzamiento (bloqueante)", "Términos de servicio + Política de privacidad", "Alta", "Pendiente", "Requerido para cobrar con MP / Ley 25.326"),

    # Calidad / Seguridad
    ("Calidad / Seguridad", "Bugs críticos corregidos (stock al vender, numeración, loop /planes)", "—", "Hecho", ""),
    ("Calidad / Seguridad", "ConfirmDialog reutilizable (reemplaza window.confirm en 9 comp.)", "—", "Hecho", ""),
    ("Calidad / Seguridad", "Verificar firma de webhook MP", "—", "Hecho", "Firma HMAC timing-safe + fail-closed en prod; cargar MP_WEBHOOK_SECRET en Vercel"),
    ("Calidad / Seguridad", "Auditoría de seguridad E2E + fixes (IDOR token MP, recibirPedido, escalación de rol, OAuth state, crons fail-closed, escape de emails)", "—", "Hecho", "Guard test anti-omisión de byTenant; ver project_gesto_seguridad. RLS no protege capa app (byTenant única defensa)"),
    ("Calidad / Seguridad", "Rate limiting en auth (login/signup)", "Media", "Pendiente", "ej: @upstash/ratelimit"),
    ("Calidad / Seguridad", "Tests de integración (flows de venta y producto)", "Media", "Pendiente", ""),
    ("Calidad / Seguridad", "Export de datos (CSV ventas / inventario)", "Media", "Pendiente", "Que el cliente no sienta lock-in"),
    ("Calidad / Seguridad", "Facturación AFIP (Tusfacturas.app, A/B)", "Media", "Pendiente", "Bloqueante segmento servicios/mayorista"),
    ("Calidad / Seguridad", "Historial de auditoría básico (quién creó/modificó)", "Baja", "Pendiente", "Mínimo en productos y ventas"),

    # Legal / Fiscal (Argentina) — para cobrar en regla y escalar
    ("Legal / Fiscal", "CUIT + Monotributo (o Responsable Inscripto)", "Alta", "Pendiente", "Bloquea cobrar en regla; ojo el tope anual de Monotributo con ingresos SaaS recurrentes"),
    ("Legal / Fiscal", "Registro de bases de datos ante la AAIP (Ley 25.326)", "Media", "Pendiente", "Sos responsable de la PII de los clientes y de SUS clientes"),
    ("Legal / Fiscal", "Botón de baja + arrepentimiento de suscripción (Res. 424/2020)", "Media", "Pendiente", "Cancelación online fácil y visible; ya existe cancelarSuscripcion"),
    ("Legal / Fiscal", "Cláusulas de transferencia internacional de datos", "Baja", "Pendiente", "Datos en AWS us-east-1; Ley 25.326 exige resguardos (EE.UU. no es país adecuado por defecto)"),
    ("Legal / Fiscal", "Estructura societaria (SAS) + acuerdo escrito con socio", "Media", "Pendiente", "Separa patrimonio del riesgo; formaliza la participación de Facu"),
    ("Legal / Fiscal", "Contrato de servicio / SLA con clientes", "Media", "Pendiente", "Dueño de los datos (el cliente), uptime, soporte, límite de responsabilidad"),

    # Infra / Escalado
    ("Infra / Escalado", "Vercel Pro + Supabase Pro", "Alta", "Pendiente", "Vercel Hobby es no comercial; Supabase Free se pausa a los 7 días. Bloquea producción real"),
    ("Infra / Escalado", "Backups diarios + PITR + probar un restore", "Media", "Pendiente", "Un backup sin restore probado no es un backup"),
    ("Infra / Escalado", "Monitoreo: activar Sentry + uptime check", "Media", "Pendiente", "SENTRY_DSN ya está en el build, falta activarlo + un cron canario"),
    ("Infra / Escalado", "Email deliverability: dominio + SPF/DKIM/DMARC (Resend)", "Media", "Pendiente", "Si no, comprobantes y facturas caen en spam"),
    ("Infra / Escalado", "Encriptar tokens MP del negocio at-rest", "Media", "Pendiente", "Hoy en texto plano en tenants (hallazgo de seguridad #9)"),

    # Backlog destacado
    ("Backlog / Ideas", "Consultor de precios para cliente final (pantalla pública con QR)", "Media", "Pendiente", "Diferenciador único; ruta /p/[tenantSlug]"),

    # Roadmap v2
    ("Roadmap v2", "Gestión de mesas (Gesto Food)", "Baja", "Pendiente", ""),
    ("Roadmap v2", "Integración balanza digital (Gesto Balanza)", "Baja", "Pendiente", ""),
    ("Roadmap v2", "Modificadores por ítem en POS (extras, variantes)", "Baja", "Pendiente", ""),
    ("Roadmap v2", "App mobile nativa con Capacitor (offline first)", "Baja", "Pendiente", ""),
    ("Roadmap v2", "Notificaciones push (stock, pedidos)", "Baja", "Pendiente", ""),
    ("Roadmap v2", "Dashboard financiero avanzado (márgenes, rentabilidad)", "Baja", "Pendiente", ""),
    ("Roadmap v2", "Multi-sucursal (varios locales bajo una cuenta madre)", "Baja", "Pendiente", ""),
]

# ================= Construcción del libro =================
wb = Workbook()
ws = wb.active
ws.title = "Roadmap"

thin = Side(style="thin", color="E2E0DD")
border = Border(left=thin, right=thin, top=thin, bottom=thin)

# Título
ws.merge_cells("A1:G1")
c = ws["A1"]
c.value = "Roadmap — Gesto (Faro Sistemas)"
c.font = Font(name="Calibri", size=18, bold=True, color=NARANJA)
c.alignment = Alignment(vertical="center")
ws.row_dimensions[1].height = 30

ws.merge_cells("A2:G2")
c = ws["A2"]
c.value = f"SaaS de gestión comercial multi-tenant · Actualizado {HOY} · Editá la columna Estado y la fecha al cerrar cada tarea"
c.font = Font(size=10, italic=True, color="78716C")

headers = ["ID", "Categoría", "Tarea", "Prioridad", "Estado", "Notas", "Actualizado"]
HEADER_ROW = 4
for col, h in enumerate(headers, start=1):
    cell = ws.cell(row=HEADER_ROW, column=col, value=h)
    cell.font = Font(bold=True, color=HEADER_FG, size=11)
    cell.fill = PatternFill("solid", fgColor=HEADER_BG)
    cell.alignment = Alignment(horizontal="center", vertical="center")
    cell.border = border
ws.row_dimensions[HEADER_ROW].height = 22

estado_fill = {
    "Hecho": PatternFill("solid", fgColor=VERDE),
    "En progreso": PatternFill("solid", fgColor=AMARILLO),
    "Pendiente": PatternFill("solid", fgColor=GRIS),
}

r = HEADER_ROW + 1
for i, (cat, tarea, prio, estado, notas) in enumerate(TAREAS, start=1):
    fila = [i, cat, tarea, prio, estado, notas, HOY]
    for col, val in enumerate(fila, start=1):
        cell = ws.cell(row=r, column=col, value=val)
        cell.border = border
        cell.alignment = Alignment(vertical="center", wrap_text=(col in (3, 6)))
        if col == 1:
            cell.alignment = Alignment(horizontal="center", vertical="center")
        if col == 4:
            cell.alignment = Alignment(horizontal="center", vertical="center")
        if col == 5:
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.font = Font(bold=True)
    r += 1

LAST = r - 1

# Anchos
widths = {"A": 5, "B": 22, "C": 56, "D": 11, "E": 13, "F": 46, "G": 13}
for col, w in widths.items():
    ws.column_dimensions[col].width = w

# Congelar y filtro
ws.freeze_panes = "A5"
ws.auto_filter.ref = f"A{HEADER_ROW}:G{LAST}"

# Validación de datos (dropdowns) en Estado y Prioridad
dv_estado = DataValidation(type="list", formula1='"Hecho,En progreso,Pendiente"', allow_blank=False)
dv_prio = DataValidation(type="list", formula1='"Alta,Media,Baja,—"', allow_blank=True)
ws.add_data_validation(dv_estado)
ws.add_data_validation(dv_prio)
dv_estado.add(f"E5:E{LAST}")
dv_prio.add(f"D5:D{LAST}")

# Formato condicional por Estado (colorea toda la fila A:G)
rng = f"A5:G{LAST}"
ws.conditional_formatting.add(rng, FormulaRule(formula=['$E5="Hecho"'], fill=estado_fill["Hecho"]))
ws.conditional_formatting.add(rng, FormulaRule(formula=['$E5="En progreso"'], fill=estado_fill["En progreso"]))
ws.conditional_formatting.add(rng, FormulaRule(formula=['$E5="Pendiente"'], fill=estado_fill["Pendiente"]))

# ================= Hoja Resumen =================
ws2 = wb.create_sheet("Resumen")
ws2.merge_cells("A1:C1")
c = ws2["A1"]
c.value = "Resumen del Roadmap"
c.font = Font(size=16, bold=True, color=NARANJA)
ws2.row_dimensions[1].height = 26

# Por estado (con fórmulas, se actualiza solo)
ws2["A3"] = "Estado"
ws2["B3"] = "Cantidad"
ws2["C3"] = "% del total"
for col in ("A3", "B3", "C3"):
    ws2[col].font = Font(bold=True, color=HEADER_FG)
    ws2[col].fill = PatternFill("solid", fgColor=HEADER_BG)
    ws2[col].alignment = Alignment(horizontal="center")

estados = ["Hecho", "En progreso", "Pendiente"]
total_ref = f"Roadmap!$E$5:$E${LAST}"
for idx, e in enumerate(estados):
    rr = 4 + idx
    ws2.cell(row=rr, column=1, value=e).fill = estado_fill[e]
    ws2.cell(row=rr, column=1).font = Font(bold=True)
    ws2.cell(row=rr, column=2, value=f'=COUNTIF({total_ref},A{rr})')
    ws2.cell(row=rr, column=3, value=f'=IFERROR(B{rr}/$B$7,0)').number_format = "0%"
ws2["A7"] = "TOTAL"
ws2["A7"].font = Font(bold=True)
ws2["B7"] = f'=COUNTA({total_ref})'
ws2["B7"].font = Font(bold=True)

# Por categoría
ws2["A10"] = "Categoría"
ws2["B10"] = "Hecho"
ws2["C10"] = "Pendiente/En curso"
for col in ("A10", "B10", "C10"):
    ws2[col].font = Font(bold=True, color=HEADER_FG)
    ws2[col].fill = PatternFill("solid", fgColor=HEADER_BG)
    ws2[col].alignment = Alignment(horizontal="center")

cats = []
for (cat, *_rest) in TAREAS:
    if cat not in cats:
        cats.append(cat)
cat_ref = f"Roadmap!$B$5:$B${LAST}"
for idx, cat in enumerate(cats):
    rr = 11 + idx
    ws2.cell(row=rr, column=1, value=cat)
    ws2.cell(row=rr, column=2,
             value=f'=COUNTIFS({cat_ref},A{rr},{total_ref},"Hecho")')
    ws2.cell(row=rr, column=3,
             value=f'=COUNTIFS({cat_ref},A{rr})-B{rr}')

ws2.column_dimensions["A"].width = 26
ws2.column_dimensions["B"].width = 12
ws2.column_dimensions["C"].width = 20

wb.save(OUT)
print("OK ->", OUT, "| filas:", len(TAREAS))
