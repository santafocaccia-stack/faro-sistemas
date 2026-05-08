# Mapa Conceptual — Faro Sistemas

> Actualizado automáticamente con cada avance. Estado al 2026-05-08.

```mermaid
mindmap
  root((Faro Sistemas))
    Infraestructura
      ✅ Next.js 15 App Router
      ✅ TypeScript strict
      ✅ Tailwind + shadcn/ui
      ✅ Drizzle ORM
      ✅ Supabase Postgres
      ✅ Supabase Auth SSR
      ✅ Middleware de sesión
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
      ⬜ Recuperar contraseña
    Productos
      ⬜ Listado con filtros
      ⬜ Alta / edición
      ⬜ Stock por kg y por unidad
      ⬜ Precios mayorista / minorista
    Clientes
      ⬜ Listado
      ⬜ Alta / edición
      ⬜ Ficha con saldo y movimientos
    Ventas
      ⬜ Nueva venta minorista (mostrador)
      ⬜ Nueva venta mayorista
      ⬜ Selección de cliente
      ⬜ Carrito de productos
      ⬜ Cobro: contado / cuenta corriente
      ⬜ Historial de ventas
    Cuenta Corriente
      ⬜ Estado de cuenta por cliente
      ⬜ Registrar pago
      ⬜ Movimientos (libro mayor)
    Reportes
      ⬜ Ventas del día
      ⬜ Ranking de productos
      ⬜ Clientes con saldo deudor
    Configuración del Negocio
      ⬜ Datos del tenant
      ⬜ Gestión de usuarios / empleados
      ⬜ Habilitar mayorista / minorista
```

---

## Estado por módulo

| Módulo | Estado | Detalle |
|---|---|---|
| Infraestructura | ✅ Completo | Stack armado, config lista |
| Base de datos | ✅ Completo | 9 tablas, migración aplicada |
| Auth | ✅ Completo | Login, signup, onboarding, bootstrap Consumidor Final |
| Productos | ⬜ Pendiente | — |
| Clientes | ⬜ Pendiente | — |
| Ventas | ⬜ Pendiente | — |
| Cuenta Corriente | ⬜ Pendiente | — |
| Reportes | ⬜ Pendiente | — |
| Config del negocio | ⬜ Pendiente | — |

---

## Leyenda
- ✅ Completo
- 🔄 En progreso
- ⬜ Pendiente
