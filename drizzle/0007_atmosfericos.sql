-- Migration 0007: Atmosféricos vertical
-- Adds plan enum value, litros column on clientes, and pedidos_atmosfericos table

ALTER TYPE "plan_gesto" ADD VALUE IF NOT EXISTS 'atmosfericos';
--> statement-breakpoint

ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "litros_pozo_estimado" numeric(10, 2);
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "estado_pedido_atmos" AS ENUM ('pendiente', 'en_camino', 'completado', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "pedidos_atmosfericos" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"        uuid NOT NULL,
  "cliente_id"       uuid,
  "nombre_contacto"  text,
  "direccion"        text NOT NULL,
  "localidad"        text,
  "referencias"      text,
  "orden"            integer DEFAULT 0 NOT NULL,
  "estado"           "estado_pedido_atmos" DEFAULT 'pendiente' NOT NULL,
  "fecha_programada" date NOT NULL,
  "litros_pozo"      numeric(10, 2),
  "litros_extraidos" numeric(10, 2),
  "monto_cobrado"    numeric(12, 2),
  "metodo_pago"      text,
  "notas"            text,
  "asignado_a"       uuid,
  "completado_at"    timestamp with time zone,
  "activo"           boolean DEFAULT true NOT NULL,
  "created_at"       timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"       timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "pedidos_atmosfericos" ADD CONSTRAINT "pedidos_atmosfericos_tenant_id_tenants_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pedidos_atmosfericos" ADD CONSTRAINT "pedidos_atmosfericos_cliente_id_clientes_id_fk"
  FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pedidos_atmosfericos" ADD CONSTRAINT "pedidos_atmosfericos_asignado_a_users_id_fk"
  FOREIGN KEY ("asignado_a") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_pedidos_atmos_tenant"  ON "pedidos_atmosfericos" ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pedidos_atmos_fecha"   ON "pedidos_atmosfericos" ("tenant_id", "fecha_programada");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pedidos_atmos_estado"  ON "pedidos_atmosfericos" ("tenant_id", "estado");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pedidos_atmos_orden"   ON "pedidos_atmosfericos" ("tenant_id", "fecha_programada", "orden");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pedidos_atmos_cliente" ON "pedidos_atmosfericos" ("cliente_id");
