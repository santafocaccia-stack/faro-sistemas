/**
 * Aplica manualmente la columna permisos a users_tenants en staging.
 * Uso: npx tsx --env-file=.env.local e2e/apply-migration-permisos.ts
 */
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

async function main() {
  console.log('Aplicando migración: ALTER TABLE users_tenants ADD COLUMN permisos...');
  await sql`
    ALTER TABLE users_tenants
    ADD COLUMN IF NOT EXISTS permisos jsonb
  `;
  console.log('Migración aplicada correctamente.');
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
