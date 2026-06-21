-- Migration 0008: Pagos de suscripción (cobro de Gesto al negocio por transferencia)
-- Tabla pagos_suscripcion + enum pago_suscripcion_estado. Idempotente.

DO $$ BEGIN
  CREATE TYPE "pago_suscripcion_estado" AS ENUM ('avisado', 'confirmado', 'rechazado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "pagos_suscripcion" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"      uuid NOT NULL,
  "plan"           "plan_gesto" NOT NULL,
  "estado"         "pago_suscripcion_estado" DEFAULT 'avisado' NOT NULL,
  "metodo"         text DEFAULT 'transferencia' NOT NULL,
  "precio_usd"     numeric(8, 2) NOT NULL,
  "dolar_mep"      numeric(12, 2) NOT NULL,
  "monto_ars"      numeric(12, 2) NOT NULL,
  "periodo_desde"  timestamp with time zone,
  "periodo_hasta"  timestamp with time zone,
  "avisado_en"     timestamp with time zone DEFAULT now() NOT NULL,
  "confirmado_en"  timestamp with time zone,
  "confirmado_por" text,
  "notas"          text,
  "created_at"     timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"     timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "pagos_suscripcion" ADD CONSTRAINT "pagos_suscripcion_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_pagos_suscripcion_tenant" ON "pagos_suscripcion" ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pagos_suscripcion_estado" ON "pagos_suscripcion" ("estado");
