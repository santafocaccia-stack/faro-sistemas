CREATE TYPE "public"."presupuesto_estado" AS ENUM('borrador', 'enviado', 'aprobado', 'rechazado', 'vencido');--> statement-breakpoint
CREATE TABLE "presupuestos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"cliente_id" uuid,
	"cliente_nombre" text,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"validez_dias" integer DEFAULT 15 NOT NULL,
	"estado" "presupuesto_estado" DEFAULT 'borrador' NOT NULL,
	"notas" text,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"descuento" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presupuestos_lineas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"presupuesto_id" uuid NOT NULL,
	"producto_id" uuid,
	"descripcion" text NOT NULL,
	"cantidad" numeric(12, 3) NOT NULL,
	"precio_unitario" numeric(12, 2) NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presupuestos_lineas" ADD CONSTRAINT "presupuestos_lineas_presupuesto_id_presupuestos_id_fk" FOREIGN KEY ("presupuesto_id") REFERENCES "public"."presupuestos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presupuestos_lineas" ADD CONSTRAINT "presupuestos_lineas_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_presupuestos_tenant" ON "presupuestos" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_presupuestos_tenant_estado" ON "presupuestos" USING btree ("tenant_id","estado");