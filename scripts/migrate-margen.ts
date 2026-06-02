/**
 * Migración: margen/recargo objetivo (para la alerta de margen bajo).
 * - tenants.margen_objetivo: recargo % objetivo sobre el costo (default 50).
 * - productos.margen_objetivo: override por producto (nullable).
 * Uso: npx tsx scripts/migrate-margen.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  await sql.unsafe(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS margen_objetivo numeric(5,2) NOT NULL DEFAULT 50`);
  await sql.unsafe(`ALTER TABLE productos ADD COLUMN IF NOT EXISTS margen_objetivo numeric(5,2)`);
  console.log('✅ margen_objetivo agregado a tenants y productos');
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
