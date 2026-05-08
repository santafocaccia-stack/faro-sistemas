CREATE TYPE "public"."condicion_iva" AS ENUM('responsable_inscripto', 'monotributo', 'consumidor_final', 'exento', 'no_categorizado');--> statement-breakpoint
CREATE TYPE "public"."tipo_cliente" AS ENUM('mayorista', 'minorista', 'ambos');--> statement-breakpoint
CREATE TYPE "public"."metodo_pago" AS ENUM('efectivo', 'transferencia', 'tarjeta_debito', 'tarjeta_credito', 'mercado_pago', 'cheque', 'otro');--> statement-breakpoint
CREATE TYPE "public"."tipo_movimiento_cc" AS ENUM('venta', 'pago', 'nota_credito', 'nota_debito', 'ajuste_debe', 'ajuste_haber', 'saldo_inicial');--> statement-breakpoint
CREATE TYPE "public"."plan_tier" AS ENUM('basico', 'pro', 'plus');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('trial', 'activo', 'moroso', 'suspendido', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."rol_tenant" AS ENUM('owner', 'admin', 'empleado');--> statement-breakpoint
CREATE TYPE "public"."tipo_unidad" AS ENUM('por_kg', 'por_unidad');--> statement-breakpoint
CREATE TYPE "public"."canal_venta" AS ENUM('mayorista', 'minorista');--> statement-breakpoint
CREATE TYPE "public"."estado_venta" AS ENUM('pendiente', 'parcial', 'pagada', 'anulada');--> statement-breakpoint
CREATE TYPE "public"."tipo_factura_afip" AS ENUM('A', 'B', 'C', 'M', 'T');--> statement-breakpoint
CREATE TYPE "public"."tipo_pago_venta" AS ENUM('contado', 'cuenta_corriente');--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tipo" "tipo_cliente" DEFAULT 'minorista' NOT NULL,
	"es_consumidor_final" boolean DEFAULT false NOT NULL,
	"razon_social" text NOT NULL,
	"nombre_fantasia" text,
	"cuit" text,
	"condicion_iva" "condicion_iva" DEFAULT 'consumidor_final' NOT NULL,
	"email" text,
	"telefono" text,
	"direccion" text,
	"localidad" text,
	"provincia" text,
	"codigo_postal" text,
	"habilita_cuenta_corriente" boolean DEFAULT false NOT NULL,
	"limite_credito" numeric(12, 2),
	"saldo_actual" numeric(12, 2) DEFAULT '0' NOT NULL,
	"dia_pago" text,
	"descuento_porcentaje" numeric(5, 2),
	"notas" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "movimientos_cuenta_corriente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"tipo" "tipo_movimiento_cc" NOT NULL,
	"venta_id" uuid,
	"pago_id" uuid,
	"debe" numeric(12, 2) DEFAULT '0' NOT NULL,
	"haber" numeric(12, 2) DEFAULT '0' NOT NULL,
	"saldo_posterior" numeric(12, 2) NOT NULL,
	"descripcion" text NOT NULL,
	"usuario_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"cliente_id" uuid,
	"venta_id" uuid,
	"usuario_id" uuid,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"metodo" "metodo_pago" NOT NULL,
	"referencia" text,
	"notas" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"anulado_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"cuit" text,
	"plan" "plan_tier" DEFAULT 'basico' NOT NULL,
	"status" "tenant_status" DEFAULT 'trial' NOT NULL,
	"trial_end" timestamp with time zone,
	"subscription_end" timestamp with time zone,
	"zona_horaria" text DEFAULT 'America/Argentina/Buenos_Aires' NOT NULL,
	"habilita_mayorista" boolean DEFAULT true NOT NULL,
	"habilita_minorista" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"nombre_completo" text,
	"telefono" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "users_tenants" (
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"rol" "rol_tenant" DEFAULT 'empleado' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_tenants_user_id_tenant_id_pk" PRIMARY KEY("user_id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "productos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text,
	"nombre" text NOT NULL,
	"descripcion" text,
	"categoria" text,
	"tipo_unidad" "tipo_unidad" DEFAULT 'por_kg' NOT NULL,
	"stock_actual" numeric(12, 3) DEFAULT '0' NOT NULL,
	"stock_minimo" numeric(12, 3),
	"costo_promedio" numeric(12, 2) DEFAULT '0' NOT NULL,
	"precio_mayorista" numeric(12, 2) DEFAULT '0' NOT NULL,
	"precio_minorista" numeric(12, 2) DEFAULT '0' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ventas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"canal" "canal_venta" NOT NULL,
	"cliente_id" uuid NOT NULL,
	"usuario_id" uuid,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"tipo_pago" "tipo_pago_venta" DEFAULT 'contado' NOT NULL,
	"estado" "estado_venta" DEFAULT 'pendiente' NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"descuento" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"monto_pagado" numeric(12, 2) DEFAULT '0' NOT NULL,
	"factura_tipo" "tipo_factura_afip",
	"factura_punto_venta" integer,
	"factura_numero" integer,
	"cae" text,
	"cae_vencimiento" timestamp with time zone,
	"notas" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"anulada_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ventas_lineas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"venta_id" uuid NOT NULL,
	"producto_id" uuid,
	"descripcion" text NOT NULL,
	"cantidad" numeric(12, 3) NOT NULL,
	"precio_unitario" numeric(12, 2) NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_cuenta_corriente" ADD CONSTRAINT "movimientos_cuenta_corriente_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_cuenta_corriente" ADD CONSTRAINT "movimientos_cuenta_corriente_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_cuenta_corriente" ADD CONSTRAINT "movimientos_cuenta_corriente_venta_id_ventas_id_fk" FOREIGN KEY ("venta_id") REFERENCES "public"."ventas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_cuenta_corriente" ADD CONSTRAINT "movimientos_cuenta_corriente_pago_id_pagos_id_fk" FOREIGN KEY ("pago_id") REFERENCES "public"."pagos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_cuenta_corriente" ADD CONSTRAINT "movimientos_cuenta_corriente_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_venta_id_ventas_id_fk" FOREIGN KEY ("venta_id") REFERENCES "public"."ventas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_tenants" ADD CONSTRAINT "users_tenants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_tenants" ADD CONSTRAINT "users_tenants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas_lineas" ADD CONSTRAINT "ventas_lineas_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas_lineas" ADD CONSTRAINT "ventas_lineas_venta_id_ventas_id_fk" FOREIGN KEY ("venta_id") REFERENCES "public"."ventas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas_lineas" ADD CONSTRAINT "ventas_lineas_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_clientes_tenant" ON "clientes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_clientes_tenant_activo" ON "clientes" USING btree ("tenant_id","activo");--> statement-breakpoint
CREATE INDEX "idx_clientes_tenant_tipo" ON "clientes" USING btree ("tenant_id","tipo");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_consumidor_final_por_tenant" ON "clientes" USING btree ("tenant_id") WHERE es_consumidor_final = true;--> statement-breakpoint
CREATE INDEX "idx_mov_cc_tenant" ON "movimientos_cuenta_corriente" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_mov_cc_tenant_cliente_fecha" ON "movimientos_cuenta_corriente" USING btree ("tenant_id","cliente_id","fecha");--> statement-breakpoint
CREATE INDEX "idx_mov_cc_tenant_venta" ON "movimientos_cuenta_corriente" USING btree ("tenant_id","venta_id");--> statement-breakpoint
CREATE INDEX "idx_mov_cc_tenant_pago" ON "movimientos_cuenta_corriente" USING btree ("tenant_id","pago_id");--> statement-breakpoint
CREATE INDEX "idx_pagos_tenant" ON "pagos" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_pagos_tenant_cliente" ON "pagos" USING btree ("tenant_id","cliente_id");--> statement-breakpoint
CREATE INDEX "idx_pagos_tenant_venta" ON "pagos" USING btree ("tenant_id","venta_id");--> statement-breakpoint
CREATE INDEX "idx_pagos_tenant_fecha" ON "pagos" USING btree ("tenant_id","fecha");--> statement-breakpoint
CREATE INDEX "idx_productos_tenant" ON "productos" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_productos_tenant_activo" ON "productos" USING btree ("tenant_id","activo");--> statement-breakpoint
CREATE INDEX "idx_productos_tenant_codigo" ON "productos" USING btree ("tenant_id","codigo");--> statement-breakpoint
CREATE INDEX "idx_ventas_tenant" ON "ventas" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_ventas_tenant_canal_numero" ON "ventas" USING btree ("tenant_id","canal","numero");--> statement-breakpoint
CREATE INDEX "idx_ventas_tenant_cliente" ON "ventas" USING btree ("tenant_id","cliente_id");--> statement-breakpoint
CREATE INDEX "idx_ventas_tenant_fecha" ON "ventas" USING btree ("tenant_id","fecha");--> statement-breakpoint
CREATE INDEX "idx_ventas_tenant_estado" ON "ventas" USING btree ("tenant_id","estado");--> statement-breakpoint
CREATE INDEX "idx_ventas_lineas_venta" ON "ventas_lineas" USING btree ("venta_id");--> statement-breakpoint
CREATE INDEX "idx_ventas_lineas_tenant_producto" ON "ventas_lineas" USING btree ("tenant_id","producto_id");