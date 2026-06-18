CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"key" text NOT NULL,
	"operacion" text NOT NULL,
	"resultado" jsonb,
	"creado_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_at" timestamp with time zone NOT NULL,
	CONSTRAINT "uniq_idempotency_tenant_key" UNIQUE("tenant_id","key")
);
--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_idempotency_tenant" ON "idempotency_keys" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_idempotency_expira" ON "idempotency_keys" USING btree ("expira_at");
