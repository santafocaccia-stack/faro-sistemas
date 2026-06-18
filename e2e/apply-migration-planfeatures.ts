/**
 * Aplica manualmente la columna plan_features al staging.
 * Uso: npx tsx --env-file=.env.local e2e/apply-migration-planfeatures.ts
 */
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = postgres(DATABASE_URL, { prepare: false });

async function main() {
  console.log('Aplicando migración: ALTER TABLE tenants ADD COLUMN plan_features...');
  await sql`
    ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS plan_features jsonb
  `;
  console.log('Migración aplicada correctamente.');
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
