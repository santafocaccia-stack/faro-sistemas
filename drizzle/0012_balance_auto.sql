-- Balance mensual automático (Tarea 22)
-- Migración hand-written, idempotente (mismo estilo que 0009-0011).
-- 1) Config por tenant: encendido + día de generación (null = último día hábil).
-- 2) Tabla de balances cerrados con el análisis (IA o fallback) ya guardado.

ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "balance_auto_activo" boolean DEFAULT true NOT NULL;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "balance_auto_dia" integer;

CREATE TABLE IF NOT EXISTS "balances_mensuales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"mes" text NOT NULL,
	"analisis" text NOT NULL,
	"generado_por_ia" boolean DEFAULT false NOT NULL,
	"datos" jsonb,
	"origen" text DEFAULT 'automatico' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
	ALTER TABLE "balances_mensuales"
		ADD CONSTRAINT "balances_mensuales_tenant_id_tenants_id_fk"
		FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_balance_tenant_mes"
	ON "balances_mensuales" USING btree ("tenant_id","mes");
