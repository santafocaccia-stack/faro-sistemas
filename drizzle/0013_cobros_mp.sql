-- Cobros con Mercado Pago (Checkout Pro / QR) — cobro real al cliente del negocio.
-- Migración hand-written idempotente (mismo estilo que 0009-0012).

CREATE TABLE IF NOT EXISTS "cobros_mp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"venta_id" uuid,
	"monto" numeric(12, 2) NOT NULL,
	"canal" text DEFAULT 'minorista' NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"preference_id" text,
	"payment_id" text,
	"init_point" text,
	"creado_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
	ALTER TABLE "cobros_mp"
		ADD CONSTRAINT "cobros_mp_tenant_id_tenants_id_fk"
		FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "cobros_mp"
		ADD CONSTRAINT "cobros_mp_venta_id_ventas_id_fk"
		FOREIGN KEY ("venta_id") REFERENCES "public"."ventas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "idx_cobros_mp_tenant" ON "cobros_mp" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_cobros_mp_tenant_estado" ON "cobros_mp" USING btree ("tenant_id","estado");
CREATE INDEX IF NOT EXISTS "idx_cobros_mp_venta" ON "cobros_mp" USING btree ("venta_id");
