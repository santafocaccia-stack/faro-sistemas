/**
 * Aplica las migraciones del vertical Atmosféricos a staging:
 *  1. Agrega el valor 'atmosfericos' al enum plan_gesto
 *  2. Agrega columna litros_pozo_estimado en clientes
 *  3. Crea el enum estado_pedido_atmos
 *  4. Crea la tabla pedidos_atmosfericos
 *
 * Uso: npx tsx --env-file=.env.local e2e/apply-migration-atmosfericos.ts
 */
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

async function main() {
  // 1. Enum plan_gesto: agregar 'atmosfericos'
  console.log('Agregando atmosfericos al enum plan_gesto...');
  await sql`ALTER TYPE plan_gesto ADD VALUE IF NOT EXISTS 'atmosfericos'`.catch(() => {
    console.log('  (ya existía o no se pudo agregar, continuando)');
  });

  // 2. Columna litros_pozo_estimado en clientes
  console.log('Agregando columna litros_pozo_estimado en clientes...');
  await sql`
    ALTER TABLE clientes
    ADD COLUMN IF NOT EXISTS litros_pozo_estimado numeric(10, 2)
  `;

  // 3. Enum estado_pedido_atmos
  console.log('Creando enum estado_pedido_atmos...');
  await sql`
    DO $$ BEGIN
      CREATE TYPE estado_pedido_atmos AS ENUM ('pendiente', 'en_camino', 'completado', 'cancelado');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  // 4. Tabla pedidos_atmosfericos
  console.log('Creando tabla pedidos_atmosfericos...');
  await sql`
    CREATE TABLE IF NOT EXISTS pedidos_atmosfericos (
      id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      cliente_id        uuid REFERENCES clientes(id) ON DELETE SET NULL,
      nombre_contacto   text,
      direccion         text NOT NULL,
      localidad         text,
      referencias       text,
      orden             integer NOT NULL DEFAULT 0,
      estado            estado_pedido_atmos NOT NULL DEFAULT 'pendiente',
      fecha_programada  date NOT NULL,
      litros_pozo       numeric(10, 2),
      litros_extraidos  numeric(10, 2),
      monto_cobrado     numeric(12, 2),
      metodo_pago       text,
      notas             text,
      asignado_a        uuid REFERENCES users(id) ON DELETE SET NULL,
      completado_at     timestamp with time zone,
      activo            boolean NOT NULL DEFAULT true,
      created_at        timestamp with time zone NOT NULL DEFAULT now(),
      updated_at        timestamp with time zone NOT NULL DEFAULT now()
    )
  `;

  // Índices
  await sql`CREATE INDEX IF NOT EXISTS idx_pedidos_atmos_tenant  ON pedidos_atmosfericos (tenant_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pedidos_atmos_fecha   ON pedidos_atmosfericos (tenant_id, fecha_programada)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pedidos_atmos_estado  ON pedidos_atmosfericos (tenant_id, estado)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pedidos_atmos_orden   ON pedidos_atmosfericos (tenant_id, fecha_programada, orden)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pedidos_atmos_cliente ON pedidos_atmosfericos (cliente_id)`;

  console.log('Migración atmosféricos completada.');
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
