-- 0009 · Tipo de comprobante en presupuestos (versión Servicios)
-- Distingue una cotización ("presupuesto") de un comprobante de cobro ("boleta").
-- Idempotente: se puede correr más de una vez sin romper.

DO $$ BEGIN
  CREATE TYPE "presupuesto_tipo" AS ENUM ('presupuesto', 'boleta');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "presupuestos"
  ADD COLUMN IF NOT EXISTS "tipo" "presupuesto_tipo" NOT NULL DEFAULT 'presupuesto';

CREATE INDEX IF NOT EXISTS "idx_presupuestos_tenant_tipo"
  ON "presupuestos" ("tenant_id", "tipo");
