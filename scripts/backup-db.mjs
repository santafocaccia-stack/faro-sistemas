/**
 * Backup lógico de todas las tablas de public a JSON (una carpeta por corrida).
 *
 *   node scripts/backup-db.mjs .env.vercel C:\ruta\backups
 *
 * No reemplaza a pg_dump (no exporta schema), pero preserva todos los datos
 * fila por fila para poder restaurar con INSERTs si hiciera falta.
 */
import postgres from 'postgres';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [, , envFile = '.env.local', destino = 'backups'] = process.argv;

const env = readFileSync(envFile, 'utf8');
const m = env.match(/^DATABASE_URL=["']?([^"'\r\n]+)/m);
if (!m) {
  console.error(`No hay DATABASE_URL en ${envFile}`);
  process.exit(1);
}

const sql = postgres(m[1], { prepare: false, max: 1 });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const dir = join(destino, `backup-${stamp}`);
mkdirSync(dir, { recursive: true });

try {
  const tablas = await sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' ORDER BY tablename`;

  let totalFilas = 0;
  for (const { tablename } of tablas) {
    const filas = await sql`SELECT * FROM ${sql(tablename)}`;
    writeFileSync(join(dir, `${tablename}.json`), JSON.stringify(filas, null, 1));
    totalFilas += filas.length;
    console.log(`${tablename}: ${filas.length} filas`);
  }
  console.log(`\nBackup OK: ${tablas.length} tablas, ${totalFilas} filas → ${dir}`);
} finally {
  await sql.end();
}
