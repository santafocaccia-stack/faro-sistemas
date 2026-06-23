-- Migration 0011: Gastos del negocio (egresos) para el balance mensual.
-- Tabla gastos (tenant-scoped, soft-delete) + índices. Idempotente.

CREATE TABLE IF NOT EXISTS "gastos" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"   uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "fecha"       timestamp with time zone DEFAULT now() NOT NULL,
  "categoria"   text NOT NULL,
  "monto"       numeric(14, 2) NOT NULL,
  "descripcion" text,
  "metodo_pago" "metodo_pago",
  "creado_por"  text,
  "created_at"  timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at"  timestamp with time zone
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_gastos_tenant" ON "gastos" ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gastos_tenant_fecha" ON "gastos" ("tenant_id", "fecha");
