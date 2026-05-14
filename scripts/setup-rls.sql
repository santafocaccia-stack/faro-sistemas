-- =============================================================================
-- RLS (Row Level Security) — Gesto
-- =============================================================================
-- CÓMO APLICAR:
--   1. Abrí el SQL Editor en Supabase Dashboard
--   2. Pegá y ejecutá este script
--   3. Verificá con: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
--
-- QUÉ HACE:
--   Habilita RLS en todas las tablas de la app. Como el servidor usa el rol
--   `postgres` (service_role), BYPASSRLS = true → no afecta al servidor.
--   El efecto real es bloquear cualquier acceso directo desde el browser
--   vía Supabase client SDK (rol `anon` / `authenticated`) sin pasar por
--   el servidor. Nadie puede leer clientes o ventas de otros tenants aunque
--   tenga la URL y la anon key.
-- =============================================================================

-- 1. Habilitar RLS en todas las tablas de la aplicación
ALTER TABLE tenants                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_tenants                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_lineas                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_cuenta_corriente   ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos_lineas            ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas anteriores si existen (idempotente)
DROP POLICY IF EXISTS "server_only_tenants"                      ON tenants;
DROP POLICY IF EXISTS "server_only_users"                        ON users;
DROP POLICY IF EXISTS "server_only_users_tenants"                ON users_tenants;
DROP POLICY IF EXISTS "server_only_clientes"                     ON clientes;
DROP POLICY IF EXISTS "server_only_productos"                    ON productos;
DROP POLICY IF EXISTS "server_only_ventas"                       ON ventas;
DROP POLICY IF EXISTS "server_only_ventas_lineas"                ON ventas_lineas;
DROP POLICY IF EXISTS "server_only_pagos"                        ON pagos;
DROP POLICY IF EXISTS "server_only_movimientos_cc"               ON movimientos_cuenta_corriente;
DROP POLICY IF EXISTS "server_only_presupuestos"                 ON presupuestos;
DROP POLICY IF EXISTS "server_only_presupuestos_lineas"          ON presupuestos_lineas;

-- 3. Políticas restrictivas: NINGÚN acceso para anon/authenticated
--    El servidor usa service_role (BYPASSRLS) → no aplica.
--    Cualquier intento de acceso directo desde el browser = denegado.

CREATE POLICY "server_only_tenants"
  ON tenants FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "server_only_users"
  ON users FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "server_only_users_tenants"
  ON users_tenants FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "server_only_clientes"
  ON clientes FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "server_only_productos"
  ON productos FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "server_only_ventas"
  ON ventas FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "server_only_ventas_lineas"
  ON ventas_lineas FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "server_only_pagos"
  ON pagos FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "server_only_movimientos_cc"
  ON movimientos_cuenta_corriente FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "server_only_presupuestos"
  ON presupuestos FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "server_only_presupuestos_lineas"
  ON presupuestos_lineas FOR ALL TO anon, authenticated USING (false);

-- 4. Verificación final
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'tenants', 'users', 'users_tenants', 'clientes', 'productos',
    'ventas', 'ventas_lineas', 'pagos', 'movimientos_cuenta_corriente',
    'presupuestos', 'presupuestos_lineas'
  )
ORDER BY tablename;

-- Resultado esperado: rls_enabled = true en todas las filas.
