# Estado del producto — Gesto (faro-sistemas)

> Capa de contexto on-demand. Antes vivía en `CLAUDE.md`; se movió acá para que no
> pese en cada spawn de subagente. Leer solo cuando se necesita el inventario de
> features o el backlog. Actualizar al cerrar features grandes.

## ✅ Construido y funcionando
- **Auth completa**: signup, login, reset-password, callback PKCE + token_hash
- **Multi-tenant + RLS**: 16 políticas, `byTenant()` en todas las queries
- **Roles**: owner / admin / empleado — control de acceso por route group y server actions
- **Onboarding**: wizard de primer uso (nombre negocio, canales)
- **POS minorista y mayorista**: split-screen, carrito Zustand, scanner ZXing (cámara)
- **Métodos de pago en POS**: efectivo, transferencia, tarjeta débito/crédito, Mercado Pago, cuenta corriente
- **Ticket / remito PDF**: `@react-pdf/renderer`, Web Share en mobile, descarga en desktop
- **Productos**: CRUD completo, Title Case, inputs numéricos vacíos (no 0)
- **Carga rápida de productos**: `/productos/carga-rapida` — scan → nombre → precio → Enter → siguiente
- **Importación CSV**: `/productos/importar-csv` — preview, validación, lotes de 100, crea categorías
- **Categorías**: filtro en lista y POS, CRUD
- **Grupos de variantes**: CRUD + sugerencia asistida al crear producto (primera palabra)
- **Proveedores**: CRUD, markup por proveedor, selector de país con banderas
- **Pedidos a proveedores**: armado desde ventas, confirmación por WhatsApp, recepción con ajuste de stock
- **Clientes**: CRUD, tipo (persona/empresa), condición IVA, descuento personalizado
- **Cuenta corriente**: movimientos, registrar pago, saldo en tiempo real
- **Presupuestos**: crear/editar, PDF compartible, estados (borrador/enviado/aceptado/rechazado)
- **Reportes**: KPIs por período (hoy / semana / mes / 3 meses), ventas por método de pago
- **Equipo**: invitar por email (Supabase Auth), editar rol, eliminar
- **Configuración negocio**: datos fiscales, canales, Mercado Pago (conectar/desconectar)
- **Planes y suscripción**: 4 planes, MP preapproval, webhook de activación/suspensión
- **Hardening server actions**: gestión → `requireAdmin()`, empleado solo accede a POS + Historial + Productos
- **Cuenta corriente — reversión de movimientos**: `revertirMovimiento` con transacción atómica + `FOR UPDATE`; botón en tabla de CC con motivo obligatorio
- **`registrarPago` — transacción atómica**: `FOR UPDATE` en el `SELECT` del cliente para evitar race conditions
- **`ConfirmDialog` reutilizable**: reemplaza `window.confirm()` en 9 componentes (venta, presupuesto, cliente, producto, proveedor, equipo, categorías, pedido, suscripción)
- **POS — atajos de teclado**: `F2` abre cobrar, `Escape` cierra modales en cascada, `Supr` quita último ítem
- **Mobile nav — badge de carrito**: muestra cantidad de ítems sobre el FAB de Vender al navegar fuera del POS
- **Bug fix — loop pantalla de planes**: usuarios con trial vencido quedaban atrapados sin poder ni volver al dashboard ni contratar; `plan-card.tsx` + `planes/page.tsx`
- **Bug fix — unidades proveedores**: cantidades `por_unidad` mostraban "1.000" (Drizzle numeric con scale 3); normalización en `pedido-detalle.tsx`
- **Variantes — filtro por grupo**: chips de grupo de variantes en `productos-list-client.tsx`; filtro funcional
- **Variantes — otras variantes en detalle**: card "Otras variantes" en `/productos/[id]` muestra productos del mismo grupo con links, stock y precio
- **Balanza — Código PLU**: campo `codigoPlu` en schema + migración aplicada; visible en el formulario de producto solo cuando el plan es `balanza`
- **Plantillas de servicios**: campo `esPlantilla`/`nombrePlantilla` en presupuestos + actions `guardarComoPlantilla`, `listarPlantillas`, `usarPlantilla`; botón en detalle del presupuesto; sección de plantillas en lista de presupuestos
- **Reporte semanal por mail**: cron `vercel.json` (lunes 10am ARG), ruta `/api/cron/reporte-semanal`, template HTML Brasas; requiere `RESEND_API_KEY` + `CRON_SECRET` en Vercel env vars
- **Precios vivos**: margen objetivo + actualización masiva con redondeo + alerta de margen bajo (ver `docs/context/precios.md`)
- **Cobro por transferencia + panel super-admin**: `/admin/suscripciones` (guard `requireSuperAdmin` por `SUPER_ADMIN_EMAILS`) lista tenants y confirma pagos con 1 click (activa + suma 1 mes desde max(hoy,vto)); en `/planes` el cliente ve datos bancarios (`TRANSFER_*`) + monto al MEP y botón "Ya transferí" (avisa, NO activa); emails de aviso/acuse/comprobante vía Resend. Tabla `pagos_suscripcion` (migración `0008`). **NO es factura fiscal AFIP** (eso va por Tusfacturas, #61)

---

## 🚀 Para lanzar (bloqueantes)

| # | Tarea | Por qué es bloqueante |
|---|---|---|
| 1 | **Dominio propio** (ej: `usegesto.app`) | La URL actual no es presentable para vender |
| 2 | **SMTP con Resend** — emails de invitación con branding, bienvenida, reset-password | Hoy Supabase envía emails sin marca — unprofessional |
| 3 | **Landing page pública** — `/` redirige al dashboard hoy | Sin landing no hay conversión orgánica |
| 4 | **PWA manifest + iconos** — `manifest.json`, iconos 192/512px, `apple-touch-icon` | El POS se usa en tablet/celular: sin PWA no se puede instalar |
| 5 | **Términos de servicio y Política de privacidad** | Requerido para cobrar con MP y cumplir RGPD/Ley 25.326 |

---

## 📋 Importantes (primera versión comercial)

| # | Tarea | Detalle |
|---|---|---|
| 6 | **Descuentos en POS** | Descuento % o $ por total de venta — muy pedido en kioscos/carnicerías |
| 7 | **Alertas de stock bajo** | Email/banner cuando `stockActual ≤ stockMinimo` — hoy el campo existe pero no dispara nada |
| 8 | **Facturación AFIP** (Tusfacturas.app) | Emisión de facturas A/B — bloqueante para el segmento servicios/mayorista |
| 9 | **Devoluciones / notas de crédito** | ~~Reversar movimientos CC~~ ✅ hecho — falta reversar venta completa con ajuste de stock |
| 10 | **Export de datos** | CSV de ventas, inventario — para que el cliente no sienta que queda "encerrado" |
| 11 | **Historial de auditoría básico** | Quién creó/modificó qué — mínimo en productos y ventas |

---

## 🔒 Seguridad y calidad

| # | Tarea | Detalle |
|---|---|---|
| 12 | ~~**Verificar firma de webhook MP**~~ ✅ hecho | Firma HMAC-SHA256 timing-safe + **fail-closed en prod** (sin `MP_WEBHOOK_SECRET` rechaza todo). Falta: cargar `MP_WEBHOOK_SECRET` en Vercel |
| 13 | **Rate limiting en auth** | Limitar intentos de login y signup (ej: `@upstash/ratelimit`) |
| 14 | **Tests de integración** | Al menos los flows de venta y creación de producto |

---

## 💡 Roadmap (v2)
- Gestión de mesas (Gesto Food)
- Integración balanza digital (Gesto Balanza)
- Modificadores por ítem (extras, variantes en POS)
- App mobile nativa con Capacitor (offline first)
- Notificaciones push (stock, pedidos)
- Dashboard financiero avanzado (márgenes, rentabilidad por producto)
- Multi-sucursal (múltiples tenants bajo una cuenta madre)
