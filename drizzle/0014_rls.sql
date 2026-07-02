-- 0014_rls.sql — Row Level Security real por tenant.
-- Idempotente: se puede pegar N veces en el SQL editor de Supabase.
--
-- SEGURO DE APLICAR ANTES DEL CUTOVER: la app hoy conecta como `postgres`
-- (BYPASSRLS), así que estas policies no le cambian nada. Lo que SÍ cierran
-- de inmediato es el acceso vía PostgREST (anon/authenticated), que hasta
-- ahora veía las tablas de `public` sin restricción.
--
-- Diseño:
--  * Todas las tablas con columna `tenant_id` reciben ENABLE + FORCE RLS y
--    una policy `tenant_isolation`: la fila es visible/escribible solo si
--    `tenant_id = current_setting('app.tenant_id', true)::uuid`.
--  * `current_setting(..., true)` devuelve NULL si no está seteado → la
--    policy evalúa false → FAIL-CLOSED (0 filas) para cualquier query que
--    no pase por `withTenant()` en la app.
--  * `tenants` no tiene tenant_id (su PK es el tenant): policy propia por id.
--  * Los caminos cross-tenant legítimos (sesión, webhooks, crons, super-admin,
--    alta de tenant) usan la conexión admin con BYPASSRLS (`dbAdmin`).

-- 1) Tablas con tenant_id ------------------------------------------------------
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables tb
      ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'tenant_id'
      AND tb.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t.table_name);
    EXECUTE format(
      $p$CREATE POLICY tenant_isolation ON public.%I
           FOR ALL
           USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
           WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid)$p$,
      t.table_name
    );
  END LOOP;
END $$;

-- 2) tenants (PK = id del tenant) ---------------------------------------------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.tenants;
CREATE POLICY tenant_isolation ON public.tenants
  FOR ALL
  USING (id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (id = current_setting('app.tenant_id', true)::uuid);

-- 3) Verificación (correr a mano, debe devolver 0 filas sin RLS) ---------------
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public' AND NOT rowsecurity
--   AND tablename IN (
--     SELECT table_name FROM information_schema.columns
--     WHERE table_schema = 'public' AND column_name = 'tenant_id'
--   );
