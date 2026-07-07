-- 0017_limpiar_policies_legacy.sql — Limpieza de RLS legacy (2026-07). Idempotente.
--
-- Prod arrastraba policies de un intento anterior de RLS vía Supabase Data API
-- (auth_tenant_id()/auth.uid()). Con el rol gesto_app (sin acceso al schema
-- auth) esas policies rompen el planner (42501). La única policy vigente es
-- tenant_isolation (0014), basada en app.tenant_id.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND policyname <> 'tenant_isolation'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.auth_tenant_id();

-- users es global (sin tenant_id) y solo se accede vía dbAdmin — paridad con
-- el estado validado en staging.
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- La app no usa el Data API de Supabase para datos (solo auth): cerrar el
-- acceso de anon/authenticated a las tablas para que la clave pública del
-- browser no pueda leer nada aunque una tabla quede sin RLS.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
