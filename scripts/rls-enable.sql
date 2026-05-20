-- ============================================================
-- RLS — Row Level Security para Gesto / Faro Sistemas
-- Ejecutar en: Supabase Dashboard > SQL Editor
--
-- Estrategia:
--   - El backend usa DATABASE_URL con el rol "postgres" (service role)
--     que bypasea RLS → las server actions siguen funcionando igual.
--   - El cliente browser usa la anon key, que SÍ está sujeto a RLS.
--   - Para operaciones del frontend vía Supabase client (auth SSR),
--     solo se permite leer/escribir los datos del propio tenant.
--
-- IMPORTANTE: las server actions de Next.js usan SUPABASE_SECRET_KEY
-- (service_role) que bypasea RLS automáticamente. Este script solo
-- protege el acceso DIRECTO a la DB (desde el browser o Postman).
-- ============================================================

-- ── 1. Habilitar RLS en todas las tablas ─────────────────────

ALTER TABLE tenants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_tenants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias           ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_lineas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuenta_corriente     ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos_lineas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_lineas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos_variantes     ENABLE ROW LEVEL SECURITY;

-- ── 2. Helper: tenant_id del usuario autenticado ─────────────
-- Devuelve el tenant_id asociado al usuario logueado.
-- Se usa en todas las policies para filtrar por tenant.

CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT tenant_id
  FROM users_tenants
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ── 3. Políticas por tabla ────────────────────────────────────

-- tenants: solo puede ver/editar su propio tenant
DROP POLICY IF EXISTS "tenants: solo el propio" ON tenants;
CREATE POLICY "tenants: solo el propio" ON tenants
  FOR ALL
  USING (id = auth_tenant_id())
  WITH CHECK (id = auth_tenant_id());

-- users: solo puede verse a sí mismo
DROP POLICY IF EXISTS "users: solo el propio" ON users;
CREATE POLICY "users: solo el propio" ON users
  FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- users_tenants: solo puede ver su propia membresía
DROP POLICY IF EXISTS "users_tenants: solo la propia" ON users_tenants;
CREATE POLICY "users_tenants: solo la propia" ON users_tenants
  FOR SELECT
  USING (user_id = auth.uid());

-- categorias
DROP POLICY IF EXISTS "categorias: solo del tenant" ON categorias;
CREATE POLICY "categorias: solo del tenant" ON categorias
  FOR ALL
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- productos
DROP POLICY IF EXISTS "productos: solo del tenant" ON productos;
CREATE POLICY "productos: solo del tenant" ON productos
  FOR ALL
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- clientes
DROP POLICY IF EXISTS "clientes: solo del tenant" ON clientes;
CREATE POLICY "clientes: solo del tenant" ON clientes
  FOR ALL
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- ventas
DROP POLICY IF EXISTS "ventas: solo del tenant" ON ventas;
CREATE POLICY "ventas: solo del tenant" ON ventas
  FOR ALL
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- ventas_lineas
DROP POLICY IF EXISTS "ventas_lineas: solo del tenant" ON ventas_lineas;
CREATE POLICY "ventas_lineas: solo del tenant" ON ventas_lineas
  FOR ALL
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- cuenta_corriente
DROP POLICY IF EXISTS "cuenta_corriente: solo del tenant" ON cuenta_corriente;
CREATE POLICY "cuenta_corriente: solo del tenant" ON cuenta_corriente
  FOR ALL
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- presupuestos
DROP POLICY IF EXISTS "presupuestos: solo del tenant" ON presupuestos;
CREATE POLICY "presupuestos: solo del tenant" ON presupuestos
  FOR ALL
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- presupuestos_lineas (si existe la tabla)
DROP POLICY IF EXISTS "presupuestos_lineas: solo del tenant" ON presupuestos_lineas;
CREATE POLICY "presupuestos_lineas: solo del tenant" ON presupuestos_lineas
  FOR ALL
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- proveedores
DROP POLICY IF EXISTS "proveedores: solo del tenant" ON proveedores;
CREATE POLICY "proveedores: solo del tenant" ON proveedores
  FOR ALL
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- producto_proveedores
DROP POLICY IF EXISTS "producto_proveedores: solo del tenant" ON producto_proveedores;
CREATE POLICY "producto_proveedores: solo del tenant" ON producto_proveedores
  FOR ALL
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- pedidos
DROP POLICY IF EXISTS "pedidos: solo del tenant" ON pedidos;
CREATE POLICY "pedidos: solo del tenant" ON pedidos
  FOR ALL
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- pedidos_lineas (si existe)
DROP POLICY IF EXISTS "pedidos_lineas: solo del tenant" ON pedidos_lineas;
CREATE POLICY "pedidos_lineas: solo del tenant" ON pedidos_lineas
  FOR ALL
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- grupos_variantes
DROP POLICY IF EXISTS "grupos_variantes: solo del tenant" ON grupos_variantes;
CREATE POLICY "grupos_variantes: solo del tenant" ON grupos_variantes
  FOR ALL
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

-- ── 4. Verificar que quedó bien ──────────────────────────────
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
