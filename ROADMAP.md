# Mapa Conceptual — Faro Sistemas

> Actualizado 2026-05-17 (v7).

```mermaid
mindmap
  root((Faro Sistemas))
    Infraestructura
      ✅ Next.js 16 App Router
      ✅ TypeScript strict
      ✅ Tailwind v4 + shadcn/ui
      ✅ Drizzle ORM
      ✅ Supabase Postgres
      ✅ Supabase Auth SSR
      ✅ Middleware de sesión
      ✅ Geist Sans + Mono
      ✅ Framer Motion
      ✅ cmdk palette
    Base de datos
      ✅ tenants
      ✅ users + users_tenants
      ✅ productos
      ✅ clientes
      ✅ ventas + ventas_lineas
      ✅ pagos
      ✅ movimientos_cuenta_corriente
      ✅ Migración aplicada en Supabase
    Auth
      ✅ Login
      ✅ Signup
      ✅ Onboarding / crear tenant
      ✅ Bootstrap Consumidor Final
      ✅ Recuperar contraseña
      ✅ Middleware sesión SSR
      ✅ Auth callback PKCE
    Productos
      ✅ Listado con filtros
      ✅ Alta / edición
      ✅ Stock por kg y por unidad
      ✅ Precios mayorista / minorista
      ✅ Ajuste de stock entrada/salida
      ✅ Skeleton loader
    Clientes
      ✅ Listado
      ✅ Alta / edición
      ✅ Ficha con saldo CC
      ✅ Skeleton loader
    Ventas
      ✅ POS unificado minorista + mayorista
      ✅ Carrito con animaciones spring
      ✅ Cobro contado / cuenta corriente
      ✅ Historial con filtro de período
      ✅ Detalle de venta
      ✅ Skeleton loaders
      ✅ Boleta ticket imprimible 80mm
      ✅ Remito mayorista A4 imprimible
      ✅ Remito mayorista descarga PDF real
      ✅ Lectura de código de barras (HID/USB)
    Cuenta Corriente
      ✅ Listado clientes con deuda
      ✅ Estado de cuenta por cliente
      ✅ Registrar pago
      ✅ Movimientos libro mayor
      ✅ Skeleton loader
    Reportes
      ✅ KPIs por período
      ✅ Ranking top productos
      ✅ Métodos de pago
      ✅ Desglose por día minorista vs mayorista
      ✅ Skeleton loader
      ✅ Exportar a CSV
    Presupuestos
      ✅ Listado con estado
      ✅ Crear presupuesto con productos
      ✅ Detalle de presupuesto
      ✅ Cambiar estado (borrador/enviado/aprobado/rechazado)
      ✅ Exportar PDF descargable
      ✅ Numeración atómica (db.transaction)
    Calidad y Bugs
      ✅ Stock se descuenta al cerrar venta
      ✅ METODO_LABEL centralizado en constants.ts
      ✅ Route handlers PDF con auth explícita y error handling
      ✅ Race condition numeración presupuestos corregida
      ✅ presupuesto-acciones: try/catch + dead import removido
    Configuración
      ✅ Datos del tenant nombre + CUIT
      ✅ Habilitar mayorista / minorista
      ✅ Gestión de equipo invitar miembros roles
      ⬜ Precios especiales por cliente
    UX / Diseño
      ✅ Design System Brasas v2 (paleta cálida hue 55 + naranja vibrante hue 43)
      ✅ Grain texture + gradientes radiales
      ✅ Sidebar rediseñada con nombre del negocio + botón VENDER + Más collapsible
      ✅ Mobile bottom nav con FAB Vender central elevado
      ✅ Dashboard rediseñado con saludo + KPIs visuales tinted
      ✅ POS retail con tarjetas avatar + carrito animado + Cobrar XL
      ✅ Command palette ⌘K
      ✅ Skeleton loaders 7 rutas
      ✅ Framer Motion stagger + AnimatePresence
      ✅ Animate fade-up en páginas
      ✅ press-scale + glow-primary + no tap highlight mobile
      ⬜ PWA / offline POS
      ⬜ Dark/light toggle
    Negocio SaaS
      ⬜ Mercado Pago Suscripciones
      ⬜ Panel super-admin tenants
      ⬜ Tusfacturas AFIP integración
      ⬜ Multi-sucursal v2
```

---

## Estado por módulo

| Módulo | Estado | Detalle |
|---|---|---|
| Infraestructura | ✅ Completo | Stack full, fonts, animations, palette |
| Base de datos | ✅ Completo | 10 tablas (+ presupuestos), migración aplicada |
| Auth | ✅ Completo | Login, signup, onboarding, reset, callback PKCE |
| Productos | ✅ Completo | Listado, CRUD, stock, ajuste |
| Clientes | ✅ Completo | Listado, CRUD, ficha CC |
| Ventas | ✅ Completo | POS, comprobantes, historial, barcode scanner, stock descuenta al vender |
| Cuenta Corriente | ✅ Completo | Movimientos, pagos, saldo |
| Reportes | ✅ Completo | KPIs, ranking, métodos de pago, desglose diario, export CSV |
| Presupuestos | ✅ Completo | CRUD, PDF, estados, numeración atómica |
| Calidad código | ✅ Completo | Bugs críticos corregidos, constantes centralizadas, error handling robusto |
| Config negocio | 🔄 85% | Equipo listo, falta precios por cliente |
| UX / Diseño | 🔄 95% | Brasas v2 + dashboard + POS + nav rediseñados. Falta PWA y dark/light toggle |
| Negocio SaaS | ⬜ Pendiente | Todo el monetization layer |

---

## Próximos pasos — orden sugerido

### 🔴 Corto plazo (impacto inmediato en usabilidad)

| # | Feature | Estado |
|---|---|---|
| 1 | **Boleta / ticket imprimible** | ✅ Implementado — ticket 80mm (minorista) + remito A4 (mayorista) |
| 2 | **Recuperar contraseña** | ✅ Implementado — forgot + reset + middleware PKCE |
| 3 | **Gestión de empleados** | ✅ Implementado — lista, invitar por email, roles owner/admin/empleado |

### 🟡 Medio plazo (completar el producto)

| # | Feature | Por qué |
|---|---|---|
| 4 | **Exportar reportes a CSV** | ✅ Implementado — descarga CSV con resumen, ventas por día, métodos de pago y top productos |
| 5 | **Precios especiales por cliente** | Mayoristas con acuerdos puntuales tienen precios distintos al general. |
| 6 | **PWA / mobile POS** | Usar desde tablet en mostrador sin instalar nada. |
| 7 | **Lectura de código de barras** | ✅ Implementado — listener HID en POS + UX "listo para escanear" en form de producto |

### 🟢 Largo plazo (monetization y escala)

| # | Feature | Por qué |
|---|---|---|
| 8 | **Panel super-admin** | Gestionar tenants, ver métricas cross-tenant, activar/suspender planes. |
| 9 | **Mercado Pago Suscripciones** | Cobro automático a tenants — sin esto no es un negocio. |
| 10 | **Tusfacturas / AFIP** | Factura electrónica para que los tenants facturen a sus clientes. |
| 11 | **Multi-sucursal** | Un solo tenant con múltiples locales. Stock separado por sucursal. |

---

## Leyenda
- ✅ Completo
- 🔄 En progreso / parcial
- ⬜ Pendiente
