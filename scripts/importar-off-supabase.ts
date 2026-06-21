/**
 * Importa productos-off-argentina.csv a la tabla productos_off en Supabase.
 * Requiere DATABASE_URL en .env.local
 *
 * Uso: npx tsx scripts/importar-off-supabase.ts
 */

import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const CSV_FILE = path.join(__dirname, 'output/productos-off-argentina.csv');
const BATCH_SIZE = 500;

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no definida en .env.local');

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 5 });

function parseCSVLine(line: string): [string, string] | null {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);

  if (parts.length < 2) return null;
  const codigo = parts[0].trim();
  const nombre = parts[1].trim();
  if (!codigo || !nombre) return null;
  return [codigo, nombre];
}

async function main() {
  console.log('Leyendo CSV...');
  const lines = fs.readFileSync(CSV_FILE, 'utf-8').split('\n');
  const rows: [string, string][] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parsed = parseCSVLine(line);
    if (parsed) rows.push(parsed);
  }

  console.log(`Productos a importar: ${rows.length.toLocaleString()}`);
  console.log('Creando tabla si no existe...');

  await sql`
    CREATE TABLE IF NOT EXISTS productos_off (
      codigo_barras text PRIMARY KEY,
      nombre_producto text NOT NULL
    )
  `;

  console.log('Insertando en lotes...');
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const values = batch.map(([codigo, nombre]) => ({ codigo_barras: codigo, nombre_producto: nombre }));

    await sql`
      INSERT INTO productos_off ${sql(values)}
      ON CONFLICT (codigo_barras) DO UPDATE SET nombre_producto = EXCLUDED.nombre_producto
    `;

    inserted += batch.length;
    process.stdout.write(`\r${inserted.toLocaleString()} / ${rows.length.toLocaleString()}`);
  }

  console.log(`\n\nListo. ${inserted.toLocaleString()} productos importados.`);
  await sql.end();
}

main().catch(async (err) => {
  console.error('Error:', err);
  await sql.end();
  process.exit(1);
});
