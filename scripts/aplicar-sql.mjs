/**
 * Aplica un archivo SQL (idempotente) contra la DB indicada.
 *
 *   node scripts/aplicar-sql.mjs drizzle/0014_rls.sql .env.staging
 *
 * Lee DATABASE_URL del archivo de env indicado (default: .env.local).
 * Usa protocolo simple (sin prepared statements) para soportar múltiples
 * statements y DO blocks a través del pooler de Supabase.
 */
import postgres from 'postgres';
import { readFileSync } from 'node:fs';

const [, , sqlPath, envFile = '.env.local'] = process.argv;
if (!sqlPath) {
  console.error('Uso: node scripts/aplicar-sql.mjs <archivo.sql> [archivo.env]');
  process.exit(1);
}

const env = readFileSync(envFile, 'utf8');
const m = env.match(/^DATABASE_URL=["']?([^"'\r\n]+)/m);
if (!m) {
  console.error(`No hay DATABASE_URL en ${envFile}`);
  process.exit(1);
}

const sql = postgres(m[1], { prepare: false, max: 1 });
const contenido = readFileSync(sqlPath, 'utf8');

try {
  await sql.unsafe(contenido);
  console.log(`OK: ${sqlPath} aplicado sobre la DB de ${envFile}`);

  // Verificación: tablas con tenant_id que NO tengan RLS activo.
  const sinRls = await sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND NOT rowsecurity
      AND tablename IN (
        SELECT table_name FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'tenant_id'
      )`;
  const conPolicy = await sql`
    SELECT count(*)::int AS n FROM pg_policies
    WHERE schemaname = 'public' AND policyname = 'tenant_isolation'`;
  console.log(`Policies tenant_isolation: ${conPolicy[0].n}`);
  if (sinRls.length > 0) {
    console.error('⚠️ Tablas tenant-scoped SIN RLS:', sinRls.map((r) => r.tablename).join(', '));
    process.exit(1);
  }
  console.log('Verificación OK: todas las tablas tenant-scoped tienen RLS activo.');
} finally {
  await sql.end();
}
