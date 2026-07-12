-- 0018 — Fix RLS de presupuestos_lineas
--
-- Bug: la tabla presupuestos_lineas tenía RLS habilitado pero SIN ninguna
-- policy (quedó fuera del loop de 0014_rls.sql, que solo cubre tablas con
-- columna tenant_id). Resultado: bajo el rol gesto_app (que respeta RLS) todo
-- INSERT/SELECT sobre esa tabla se denegaba fail-closed. En la app se veía como
-- "error al emitir boleta / crear presupuesto" (el server action fallaba al
-- insertar las líneas).
--
-- Fix: darle a presupuestos_lineas la columna tenant_id (como ventas_lineas y
-- pedidos_lineas) + la policy tenant_isolation estándar. Idempotente.

-- 1) Columna tenant_id (nullable primero para poder backfillear) --------------
ALTER TABLE public.presupuestos_lineas
  ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- 2) Backfill desde el presupuesto padre --------------------------------------
UPDATE public.presupuestos_lineas l
   SET tenant_id = p.tenant_id
  FROM public.presupuestos p
 WHERE p.id = l.presupuesto_id
   AND l.tenant_id IS NULL;

-- 3) FK + NOT NULL ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'presupuestos_lineas_tenant_id_tenants_id_fk'
      AND table_name = 'presupuestos_lineas'
  ) THEN
    ALTER TABLE public.presupuestos_lineas
      ADD CONSTRAINT presupuestos_lineas_tenant_id_tenants_id_fk
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.presupuestos_lineas
  ALTER COLUMN tenant_id SET NOT NULL;

-- 4) Índice por tenant (consistencia con las demás tablas) --------------------
CREATE INDEX IF NOT EXISTS idx_presupuestos_lineas_tenant
  ON public.presupuestos_lineas (tenant_id);

-- 5) RLS + policy estándar ----------------------------------------------------
ALTER TABLE public.presupuestos_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuestos_lineas FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.presupuestos_lineas;
CREATE POLICY tenant_isolation ON public.presupuestos_lineas
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
