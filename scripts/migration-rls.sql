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
-- ║ Correr en el SQL Editor de Supabase.                                   ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- ── Helper: tenant del usuario autenticado ──────────────────────────────────
-- SECURITY DEFINER permite a la función leer users_tenants aunque el usuario
-- no tenga policy de SELECT directa. STABLE = mismo resultado en una query.
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

-- Permitir que cualquier rol autenticado ejecute el helper
GRANT EXECUTE ON FUNCTION auth_tenant_id() TO authenticated, anon;

-- ── Activar RLS en todas las tablas ─────────────────────────────────────────
ALTER TABLE tenants               ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_tenants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_lineas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuenta_corriente      ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_proveedores  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias            ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos_variantes      ENABLE ROW LEVEL SECURITY;

-- Si existe la tabla de líneas de presupuesto / pedido también
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'presupuestos_lineas') THEN
    EXECUTE 'ALTER TABLE presupuestos_lineas ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pedidos_lineas') THEN
    EXECUTE 'ALTER TABLE pedidos_lineas ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ── Limpiar policies viejas si existen (para poder re-correr la migración) ──
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

-- ── Policy genérica: el usuario solo ve y modifica filas de SU tenant ──────
-- Para tablas con columna tenant_id
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

CREATE POLICY gesto_tenant_isolation ON cuenta_corriente
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

CREATE POLICY gesto_tenant_isolation ON pedidos
  FOR ALL TO authenticated
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY gesto_tenant_isolation ON presupuestos
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

-- Líneas de presupuestos / pedidos (si existen)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'presupuestos_lineas') THEN
    EXECUTE $POL$
      CREATE POLICY gesto_tenant_isolation ON presupuestos_lineas
        FOR ALL TO authenticated
        USING (tenant_id = auth_tenant_id())
        WITH CHECK (tenant_id = auth_tenant_id())
    $POL$;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pedidos_lineas') THEN
    EXECUTE $POL$
      CREATE POLICY gesto_tenant_isolation ON pedidos_lineas
        FOR ALL TO authenticated
        USING (tenant_id = auth_tenant_id())
        WITH CHECK (tenant_id = auth_tenant_id())
    $POL$;
  END IF;
END $$;

-- ── Policies para tablas especiales (no tienen tenant_id directo) ──────────

-- tenants: el usuario ve SU tenant (el que está en su users_tenants)
CREATE POLICY gesto_tenant_own ON tenants
  FOR ALL TO authenticated
  USING (id = auth_tenant_id())
  WITH CHECK (id = auth_tenant_id());

-- users_tenants: el usuario ve sus propias memberships
CREATE POLICY gesto_users_tenants_own ON users_tenants
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- users: el usuario ve su propio registro
CREATE POLICY gesto_users_self ON users
  FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║ Verificación rápida — listar todas las policies creadas                ║
-- ╚════════════════════════════════════════════════════════════════════════╝
-- SELECT tablename, policyname, cmd, roles
--   FROM pg_policies
--  WHERE schemaname = 'public' AND policyname LIKE 'gesto_%'
--  ORDER BY tablename;
