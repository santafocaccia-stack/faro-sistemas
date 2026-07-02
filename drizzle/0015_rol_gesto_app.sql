-- 0015_rol_gesto_app.sql — Rol de conexión de la app SIN BYPASSRLS (cutover).
--
-- ⚠️ NO APLICAR hasta que TODO el código use withTenant()/dbAdmin (ver
-- migración de call sites). Aplicar recién en el cutover:
--   1. Reemplazar __PASSWORD__ por un secreto fuerte (no commitear).
--   2. Ejecutar este SQL.
--   3. En Vercel: DATABASE_URL → usuario `gesto_app.<project-ref>` (pooler)
--      y DATABASE_URL_ADMIN → la URL actual (postgres).
--   4. Redeploy + smoke test. Rollback = volver DATABASE_URL al valor previo.
--
-- Idempotente salvo el password (re-ejecutar actualiza grants).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gesto_app') THEN
    CREATE ROLE gesto_app LOGIN PASSWORD '__PASSWORD__' NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO gesto_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gesto_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gesto_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO gesto_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO gesto_app;

-- Verificación: debe devolver rolbypassrls = false
-- SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'gesto_app';
