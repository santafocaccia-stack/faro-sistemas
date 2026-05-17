-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║ Row Level Security (RLS) — aislamiento multi-tenant a nivel base       ║
-- ║                                                                        ║
-- ║ Script 100 % defensivo: sólo activa RLS y crea policies en las tablas  ║
-- ║ que EXISTAN en la DB y TENGAN la columna requerida (tenant_id / id).   ║
-- ║ Idempotente — se puede re-correr sin errores.                           ║
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

-- ── Función helper interna ───────────────────────────────────────────────────
-- Devuelve TRUE si la tabla existe en public Y tiene la columna indicada
CREATE OR REPLACE FUNCTION _tabla_tiene_columna(p_tabla text, p_columna text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = p_tabla
      AND column_name  = p_columna
  )
$$;

-- ── Activar RLS + policy por tenant_id (tablas estándar) ────────────────────
DO $$
DECLARE
  tbl text;
  tablas text[] := ARRAY[
    'productos',
    'clientes',
    'ventas',
    'ventas_lineas',
    'pagos',
    'movimientos_cuenta_corriente',
    'proveedores',
    'producto_proveedores',
    'pedidos_proveedores',
    'pedidos_lineas',
    'presupuestos',
    'presupuestos_lineas',
    'categorias',
    'grupos_variantes'
  ];
BEGIN
  FOREACH tbl IN ARRAY tablas LOOP
    IF _tabla_tiene_columna(tbl, 'tenant_id') THEN
      -- Activar RLS
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      -- Crear policy de aislamiento
      EXECUTE format(
        'CREATE POLICY gesto_tenant_isolation ON %I
           FOR ALL TO authenticated
           USING (tenant_id = auth_tenant_id())
           WITH CHECK (tenant_id = auth_tenant_id())',
        tbl
      );
      RAISE NOTICE 'RLS activado en tabla: %', tbl;
    ELSE
      RAISE NOTICE 'SKIP — tabla "%" no existe o no tiene tenant_id', tbl;
    END IF;
  END LOOP;
END $$;

-- ── Tabla tenants (columna "id", no tenant_id) ──────────────────────────────
DO $$
BEGIN
  IF _tabla_tiene_columna('tenants', 'id') THEN
    ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
    CREATE POLICY gesto_tenant_own ON tenants
      FOR ALL TO authenticated
      USING (id = auth_tenant_id())
      WITH CHECK (id = auth_tenant_id());
    RAISE NOTICE 'RLS activado en tabla: tenants';
  ELSE
    RAISE NOTICE 'SKIP — tabla "tenants" no existe o no tiene columna id';
  END IF;
END $$;

-- ── Tabla users_tenants ──────────────────────────────────────────────────────
DO $$
BEGIN
  IF _tabla_tiene_columna('users_tenants', 'user_id') THEN
    ALTER TABLE users_tenants ENABLE ROW LEVEL SECURITY;
    CREATE POLICY gesto_users_tenants_own ON users_tenants
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
    RAISE NOTICE 'RLS activado en tabla: users_tenants';
  ELSE
    RAISE NOTICE 'SKIP — tabla "users_tenants" no existe o no tiene columna user_id';
  END IF;
END $$;

-- ── Tabla users ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF _tabla_tiene_columna('users', 'id') THEN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    CREATE POLICY gesto_users_self ON users
      FOR ALL TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
    RAISE NOTICE 'RLS activado en tabla: users';
  ELSE
    RAISE NOTICE 'SKIP — tabla "users" no existe o no tiene columna id';
  END IF;
END $$;

-- ── Limpiar función helper interna ───────────────────────────────────────────
DROP FUNCTION IF EXISTS _tabla_tiene_columna(text, text);

-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║ Verificación — listar todas las policies creadas                        ║
-- ╚════════════════════════════════════════════════════════════════════════╝
SELECT tablename, policyname, cmd, roles
  FROM pg_policies
 WHERE schemaname = 'public' AND policyname LIKE 'gesto_%'
 ORDER BY tablename;
