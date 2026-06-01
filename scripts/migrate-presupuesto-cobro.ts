/**
 * Migración: cobro de presupuestos (plan Servicios).
 * - Agrega el valor 'cobrado' al enum presupuesto_estado.
 * - Agrega columnas cobrado_at + metodo_cobro a presupuestos.
 *
 * Uso: npx tsx scripts/migrate-presupuesto-cobro.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL!;

async function main() {
  const sql = postgres(DATABASE_URL, { prepare: false });
  console.log('🔧 Migrando: cobro de presupuestos…');

  // Nuevo valor de enum (no puede ir dentro de transacción con uso inmediato)
  await sql.unsafe(`ALTER TYPE presupuesto_estado ADD VALUE IF NOT EXISTS 'cobrado'`);
  console.log('  ✅ enum presupuesto_estado += cobrado');

  await sql.unsafe(`ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS cobrado_at timestamptz`);
  await sql.unsafe(`ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS metodo_cobro metodo_pago`);
  console.log('  ✅ presupuestos += cobrado_at, metodo_cobro');

  await sql.end();
  console.log('\n✨ Migración aplicada.');
}

main().catch((e) => {
  console.error('\n❌ Error:', e);
  process.exit(1);
});
