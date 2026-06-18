CREATE TYPE "public"."estado_ocurrencia" AS ENUM('pendiente', 'pagado', 'vencido', 'omitido');--> statement-breakpoint
CREATE TYPE "public"."estado_turno" AS ENUM('agendado', 'confirmado', 'en_curso', 'completado', 'cancelado', 'no_asistio');--> statement-breakpoint
CREATE TYPE "public"."periodicidad_vencimiento" AS ENUM('unico', 'mensual', 'bimestral', 'trimestral', 'semestral', 'anual');--> statement-breakpoint
CREATE TYPE "public"."tipo_vencimiento" AS ENUM('monotributo_afip', 'iva', 'ganancias', 'vtv', 'seguro_rc', 'seguro_auto', 'art', 'matricula', 'habilitacion', 'certificacion', 'herramienta', 'otro');--> statement-breakpoint
CREATE TYPE "public"."plan_gesto" AS ENUM('servicios', 'market', 'food', 'balanza', 'prestamista');--> statement-breakpoint
CREATE TYPE "public"."estado_pedido" AS ENUM('borrador', 'enviado', 'recibido');--> statement-breakpoint
CREATE TYPE "public"."estado_cuota" AS ENUM('pendiente', 'parcial', 'pagada', 'vencida');--> statement-breakpoint
CREATE TYPE "public"."estado_prestamo" AS ENUM('vigente', 'en_mora', 'cancelado', 'refinanciado', 'incobrable');--> statement-breakpoint
CREATE TYPE "public"."frecuencia_pago" AS ENUM('diaria', 'semanal', 'quincenal', 'mensual');--> statement-breakpoint
CREATE TYPE "public"."sistema_amortizacion" AS ENUM('frances', 'aleman', 'americano');--> statement-breakpoint
ALTER TYPE "public"."presupuesto_estado" ADD VALUE 'cobrado';--> statement-breakpoint
CREATE TABLE "turnos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"cliente_id" uuid,
	"estado" "estado_turno" DEFAULT 'agendado' NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text,
	"direccion" text,
	"localidad" text,
	"inicio" timestamp with time zone NOT NULL,
	"duracion_min" integer DEFAULT 60 NOT NULL,
	"monto_estimado" numeric(12, 2),
	"presupuesto_id" uuid,
	"venta_id" uuid,
	"notas" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vencimientos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tipo" "tipo_vencimiento" DEFAULT 'otro' NOT NULL,
	"titulo" text NOT NULL,
	"proximo_vencimiento" date NOT NULL,
	"periodicidad" "periodicidad_vencimiento" DEFAULT 'anual' NOT NULL,
	"dias_aviso_anticipado" integer DEFAULT 7 NOT NULL,
	"monto_estimado" numeric(12, 2),
	"activo" boolean DEFAULT true NOT NULL,
	"notas" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vencimientos_ocurrencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vencimiento_id" uuid NOT NULL,
	"vence" date NOT NULL,
	"estado" "estado_ocurrencia" DEFAULT 'pendiente' NOT NULL,
	"pagado_at" timestamp with time zone,
	"monto_pagado" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grupos_variantes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedidos_lineas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"pedido_id" uuid NOT NULL,
	"producto_id" uuid NOT NULL,
	"cantidad_pedida" numeric(12, 3) DEFAULT '0' NOT NULL,
	"cantidad_recibida" numeric(12, 3),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedidos_proveedores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"estado" "estado_pedido" DEFAULT 'borrador' NOT NULL,
	"notas" text,
	"enviado_at" timestamp with time zone,
	"recibido_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "producto_proveedores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"producto_id" uuid NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"precio_costo" numeric(12, 2) DEFAULT '0' NOT NULL,
	"markup_mayorista" numeric(6, 2),
	"markup_minorista" numeric(6, 2),
	"es_principal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proveedores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"contacto" text,
	"telefono" text,
	"dias_pedido" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"markup_mayorista" numeric(6, 2) DEFAULT '0' NOT NULL,
	"markup_minorista" numeric(6, 2) DEFAULT '0' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cuotas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prestamo_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"vencimiento" date NOT NULL,
	"monto_cuota" numeric(12, 2) NOT NULL,
	"capital" numeric(12, 2) NOT NULL,
	"interes" numeric(12, 2) NOT NULL,
	"saldo_posterior" numeric(12, 2) NOT NULL,
	"estado" "estado_cuota" DEFAULT 'pendiente' NOT NULL,
	"monto_pagado" numeric(12, 2) DEFAULT '0' NOT NULL,
	"mora_acumulada" numeric(12, 2) DEFAULT '0' NOT NULL,
	"pagada_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagos_prestamo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prestamo_id" uuid NOT NULL,
	"cliente_id" uuid,
	"usuario_id" uuid,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"monto_total" numeric(12, 2) NOT NULL,
	"a_mora" numeric(12, 2) DEFAULT '0' NOT NULL,
	"a_interes" numeric(12, 2) DEFAULT '0' NOT NULL,
	"a_capital" numeric(12, 2) DEFAULT '0' NOT NULL,
	"metodo" "metodo_pago" DEFAULT 'efectivo' NOT NULL,
	"referencia" text,
	"anulado_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prestamos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"estado" "estado_prestamo" DEFAULT 'vigente' NOT NULL,
	"sistema" "sistema_amortizacion" DEFAULT 'frances' NOT NULL,
	"capital" numeric(12, 2) NOT NULL,
	"tasa_nominal_anual" numeric(7, 4) NOT NULL,
	"frecuencia" "frecuencia_pago" DEFAULT 'mensual' NOT NULL,
	"cantidad_cuotas" integer NOT NULL,
	"fecha_otorgamiento" date NOT NULL,
	"fecha_primer_vencimiento" date NOT NULL,
	"tasa_punitoria_anual" numeric(7, 4),
	"dias_gracia" integer DEFAULT 0 NOT NULL,
	"notas" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "plan" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "plan" SET DATA TYPE "public"."plan_gesto" USING "plan"::text::"public"."plan_gesto";--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "plan" SET DEFAULT 'market';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "mp_subscription_id" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "mp_negocio_access_token" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "mp_negocio_refresh_token" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "mp_negocio_token_expiry" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "mp_negocio_user_id" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "precios_vivos" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "margen_objetivo" numeric(5, 2) DEFAULT '50' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "direccion" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "telefono" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "email_negocio" text;--> statement-breakpoint
ALTER TABLE "productos" ADD COLUMN "codigo_plu" text;--> statement-breakpoint
ALTER TABLE "productos" ADD COLUMN "categoria_id" uuid;--> statement-breakpoint
ALTER TABLE "productos" ADD COLUMN "grupo_variante_id" uuid;--> statement-breakpoint
ALTER TABLE "productos" ADD COLUMN "margen_objetivo" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "presupuestos" ADD COLUMN "cobrado_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "presupuestos" ADD COLUMN "metodo_cobro" "metodo_pago";--> statement-breakpoint
ALTER TABLE "presupuestos" ADD COLUMN "es_plantilla" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "presupuestos" ADD COLUMN "nombre_plantilla" text;--> statement-breakpoint
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vencimientos" ADD CONSTRAINT "vencimientos_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vencimientos_ocurrencias" ADD CONSTRAINT "vencimientos_ocurrencias_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vencimientos_ocurrencias" ADD CONSTRAINT "vencimientos_ocurrencias_vencimiento_id_vencimientos_id_fk" FOREIGN KEY ("vencimiento_id") REFERENCES "public"."vencimientos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grupos_variantes" ADD CONSTRAINT "grupos_variantes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos_lineas" ADD CONSTRAINT "pedidos_lineas_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos_lineas" ADD CONSTRAINT "pedidos_lineas_pedido_id_pedidos_proveedores_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos_proveedores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos_lineas" ADD CONSTRAINT "pedidos_lineas_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos_proveedores" ADD CONSTRAINT "pedidos_proveedores_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos_proveedores" ADD CONSTRAINT "pedidos_proveedores_proveedor_id_proveedores_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_proveedores" ADD CONSTRAINT "producto_proveedores_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_proveedores" ADD CONSTRAINT "producto_proveedores_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_proveedores" ADD CONSTRAINT "producto_proveedores_proveedor_id_proveedores_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuotas" ADD CONSTRAINT "cuotas_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuotas" ADD CONSTRAINT "cuotas_prestamo_id_prestamos_id_fk" FOREIGN KEY ("prestamo_id") REFERENCES "public"."prestamos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos_prestamo" ADD CONSTRAINT "pagos_prestamo_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos_prestamo" ADD CONSTRAINT "pagos_prestamo_prestamo_id_prestamos_id_fk" FOREIGN KEY ("prestamo_id") REFERENCES "public"."prestamos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos_prestamo" ADD CONSTRAINT "pagos_prestamo_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos_prestamo" ADD CONSTRAINT "pagos_prestamo_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_turnos_tenant" ON "turnos" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_turnos_tenant_inicio" ON "turnos" USING btree ("tenant_id","inicio");--> statement-breakpoint
CREATE INDEX "idx_turnos_tenant_estado" ON "turnos" USING btree ("tenant_id","estado");--> statement-breakpoint
CREATE INDEX "idx_turnos_tenant_cliente" ON "turnos" USING btree ("tenant_id","cliente_id");--> statement-breakpoint
CREATE INDEX "idx_venc_tenant" ON "vencimientos" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_venc_tenant_proximo" ON "vencimientos" USING btree ("tenant_id","proximo_vencimiento");--> statement-breakpoint
CREATE INDEX "idx_venc_tenant_activo" ON "vencimientos" USING btree ("tenant_id","activo");--> statement-breakpoint
CREATE INDEX "idx_venc_oc_tenant" ON "vencimientos_ocurrencias" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_venc_oc_venc" ON "vencimientos_ocurrencias" USING btree ("vencimiento_id");--> statement-breakpoint
CREATE INDEX "idx_categorias_tenant" ON "categorias" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_grupos_variantes_tenant" ON "grupos_variantes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_pedidos_lineas_tenant" ON "pedidos_lineas" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_pedidos_lineas_pedido" ON "pedidos_lineas" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "idx_pedidos_lineas_producto" ON "pedidos_lineas" USING btree ("producto_id");--> statement-breakpoint
CREATE INDEX "idx_pedidos_prov_tenant" ON "pedidos_proveedores" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_pedidos_prov_proveedor" ON "pedidos_proveedores" USING btree ("proveedor_id");--> statement-breakpoint
CREATE INDEX "idx_pedidos_prov_estado" ON "pedidos_proveedores" USING btree ("tenant_id","estado");--> statement-breakpoint
CREATE INDEX "idx_prod_prov_tenant" ON "producto_proveedores" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_prod_prov_producto" ON "producto_proveedores" USING btree ("producto_id");--> statement-breakpoint
CREATE INDEX "idx_prod_prov_proveedor" ON "producto_proveedores" USING btree ("proveedor_id");--> statement-breakpoint
CREATE INDEX "idx_proveedores_tenant" ON "proveedores" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_cuota_prestamo_numero" ON "cuotas" USING btree ("prestamo_id","numero");--> statement-breakpoint
CREATE INDEX "idx_cuotas_tenant" ON "cuotas" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_cuotas_tenant_vencimiento" ON "cuotas" USING btree ("tenant_id","vencimiento");--> statement-breakpoint
CREATE INDEX "idx_cuotas_prestamo" ON "cuotas" USING btree ("prestamo_id");--> statement-breakpoint
CREATE INDEX "idx_pagos_prestamo_tenant" ON "pagos_prestamo" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_pagos_prestamo_prestamo" ON "pagos_prestamo" USING btree ("prestamo_id");--> statement-breakpoint
CREATE INDEX "idx_prestamos_tenant" ON "prestamos" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_prestamos_tenant_estado" ON "prestamos" USING btree ("tenant_id","estado");--> statement-breakpoint
CREATE INDEX "idx_prestamos_tenant_cliente" ON "prestamos" USING btree ("tenant_id","cliente_id");--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_grupo_variante_id_grupos_variantes_id_fk" FOREIGN KEY ("grupo_variante_id") REFERENCES "public"."grupos_variantes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" DROP COLUMN "categoria";--> statement-breakpoint
DROP TYPE "public"."plan_tier";