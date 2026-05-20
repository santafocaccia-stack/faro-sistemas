-- ============================================================
-- Índices de performance — Gesto / Faro Sistemas
-- Ejecutar en: Supabase Dashboard > SQL Editor
--
-- Estrategia: cada índice cubre los filtros más frecuentes
-- (tenant_id + columna de filtrado/orden) para evitar seq-scans.
-- ============================================================

-- ── ventas ───────────────────────────────────────────────────
-- Dashboard KPIs: filtran por tenant + fecha + estado
CREATE INDEX IF NOT EXISTS idx_ventas_tenant_fecha
  ON ventas (tenant_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_ventas_tenant_estado
  ON ventas (tenant_id, estado);

-- Historial: tenant + fecha DESC (paginado)
CREATE INDEX IF NOT EXISTS idx_ventas_tenant_canal_fecha
  ON ventas (tenant_id, canal, fecha DESC);

-- ── clientes ─────────────────────────────────────────────────
-- Listado con saldo: filtran por tenant, ordenan por razon_social
CREATE INDEX IF NOT EXISTS idx_clientes_tenant_activo
  ON clientes (tenant_id, activo);

-- Cuenta corriente: filtran por tenant y saldo_actual > 0
CREATE INDEX IF NOT EXISTS idx_clientes_tenant_saldo
  ON clientes (tenant_id, saldo_actual DESC)
  WHERE saldo_actual > 0;

-- ── productos ────────────────────────────────────────────────
-- Listado POS y catálogo: activos del tenant
CREATE INDEX IF NOT EXISTS idx_productos_tenant_activo
  ON productos (tenant_id, activo);

-- Stock bajo: filtran tenant + stock_actual <= stock_minimo
CREATE INDEX IF NOT EXISTS idx_productos_tenant_stock
  ON productos (tenant_id, stock_actual);

-- Búsqueda por nombre (trigram para ILIKE)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_productos_nombre_trgm
  ON productos USING gin (nombre gin_trgm_ops);

-- ── ventas_lineas ─────────────────────────────────────────────
-- Reportes: JOIN con ventas por venta_id
CREATE INDEX IF NOT EXISTS idx_ventas_lineas_venta_id
  ON ventas_lineas (venta_id);

CREATE INDEX IF NOT EXISTS idx_ventas_lineas_tenant
  ON ventas_lineas (tenant_id);

-- ── presupuestos ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_presupuestos_tenant_fecha
  ON presupuestos (tenant_id, fecha DESC);

-- ── cuenta_corriente / pagos ──────────────────────────────────
-- Movimientos por cliente (ficha de cuenta corriente)
CREATE INDEX IF NOT EXISTS idx_movimientos_cc_cliente
  ON movimientos_cuenta_corriente (cliente_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_movimientos_cc_tenant
  ON movimientos_cuenta_corriente (tenant_id);

-- ── users_tenants ─────────────────────────────────────────────
-- requireSession() hace JOIN por user_id
CREATE INDEX IF NOT EXISTS idx_users_tenants_user_id
  ON users_tenants (user_id);

-- ── Verificar ────────────────────────────────────────────────
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
