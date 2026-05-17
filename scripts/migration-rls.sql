-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║ Row Level Security (RLS) — aislamiento multi-tenant a nivel base       ║
-- ║                                                                        ║
-- ║ Esta migración activa RLS en todas las tablas con tenant_id y crea     ║
-- ║ políticas que restringen el acceso al tenant del usuario autenticado.  ║
-- ║                                                                        ║
-- ║ Nota: las conexiones del servidor (Drizzle vía DATABASE_URL) usan el   ║
-- ║ rol postgres que BYPASSEA RLS. byTenant() en el código sigue siendo    ║
-- ║ la primera capa de defensa. RLS protege contra:                        ║
-- ║   1. Acceso directo desde el cliente Supabase (browser)                ║
-- ║   2. Llamadas directas a PostgREST                                     ║
-- ║   3. Bugs en server actions que se salteen byTenant() por error        ║
-- ║                                                                        ║
-- ║ Correr en el SQL Editor de Supabase. Idempotente — se puede re-correr. ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- ── Helper: tenant del usuario autenticado ──────────────────────────────────
CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM users_tenants
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION auth_tenant_id() TO authenticated, anon;

-- ── Activar RLS en todas las tablas ─────────────────────────────────────────
ALTER TABLE tenants                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_tenants                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_lineas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_cuenta_corriente  ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_proveedores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_proveedores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_lineas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos_lineas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos_variantes              ENABLE ROW LEVEL SECURITY;

-- ── Limpiar policies viejas (re-corribilidad) ───────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname LIKE 'gesto_%'
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ── Políticas: aislamiento por tenant_id ────────────────────────────────────
CREATE POLICY gesto_tenant_isolation ON productos
  FOR ALL TO authenticated
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY gesto_tenant_isolation ON clientes
  FOR ALL TO authenticated
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY gesto_tenant_isolation ON ventas
  FOR ALL TO authenticated
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY gesto_tenant_isolation ON ventas_lineas
  FOR ALL TO authenticated
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY gesto_tenant_isolation ON pagos
  FOR ALL TO authenticated
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY gesto_tenant_isolation ON movimientos_cuenta_corriente
  FOR ALL TO authenticated
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY gesto_tenant_isolation ON proveedores
  FOR ALL TO authenticated
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY gesto_tenant_isolation ON producto_proveedores
  FOR ALL TO authenticated
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY gesto_tenant_isolation ON pedidos_proveedores
  FOR ALL TO authenticated
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY gesto_tenant_isolation ON pedidos_lineas
  FOR ALL TO authenticated
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY gesto_tenant_isolation ON presupuestos
  FOR ALL TO authenticated
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY gesto_tenant_isolation ON presupuestos_lineas
  FOR ALL TO authenticated
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY gesto_tenant_isolation ON categorias
  FOR ALL TO authenticated
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY gesto_tenant_isolation ON grupos_variantes
  FOR ALL TO authenticated
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- ── Tablas especiales (no tienen tenant_id directo) ────────────────────────
CREATE POLICY gesto_tenant_own ON tenants
  FOR ALL TO authenticated
  USING (id = auth_tenant_id())
  WITH CHECK (id = auth_tenant_id());

CREATE POLICY gesto_users_tenants_own ON users_tenants
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY gesto_users_self ON users
  FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║ Verificación rápida — listar todas las policies creadas (17)           ║
-- ╚════════════════════════════════════════════════════════════════════════╝
-- SELECT tablename, policyname, cmd, roles
--   FROM pg_policies
--  WHERE schemaname = 'public' AND policyname LIKE 'gesto_%'
--  ORDER BY tablename;
