-- 0019 — Cobros parciales de presupuestos (plan servicios)
-- Idempotente. Tabla de pagos individuales + acumulado en presupuestos.
-- Backfill: presupuestos ya cobrados generan su fila de cobro.

BEGIN;

ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS monto_cobrado numeric(12,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS presupuestos_cobros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  presupuesto_id uuid NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
  monto numeric(12,2) NOT NULL,
  metodo metodo_pago NOT NULL,
  cobrado_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS presupuestos_cobros_tenant_idx ON presupuestos_cobros (tenant_id);
CREATE INDEX IF NOT EXISTS presupuestos_cobros_presupuesto_idx ON presupuestos_cobros (presupuesto_id);
CREATE INDEX IF NOT EXISTS presupuestos_cobros_fecha_idx ON presupuestos_cobros (tenant_id, cobrado_at);

ALTER TABLE presupuestos_cobros ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos_cobros FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON presupuestos_cobros;
CREATE POLICY tenant_isolation ON presupuestos_cobros
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON presupuestos_cobros TO gesto_app;

-- Backfill de presupuestos ya cobrados (una sola vez: solo si no tienen cobros)
INSERT INTO presupuestos_cobros (tenant_id, presupuesto_id, monto, metodo, cobrado_at)
SELECT p.tenant_id, p.id, p.total, COALESCE(p.metodo_cobro, 'efectivo'), COALESCE(p.cobrado_at, now())
FROM presupuestos p
WHERE p.estado = 'cobrado'
  AND NOT EXISTS (SELECT 1 FROM presupuestos_cobros c WHERE c.presupuesto_id = p.id);

UPDATE presupuestos SET monto_cobrado = total WHERE estado = 'cobrado' AND monto_cobrado = 0;

COMMIT;
