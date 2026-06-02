/**
 * Migración: flag "Precios vivos" (opción activable por negocio).
 * Uso: npx tsx scripts/migrate-precios-vivos.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  await sql.unsafe(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS precios_vivos boolean NOT NULL DEFAULT false`);
  console.log('✅ tenants.precios_vivos agregado');
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
