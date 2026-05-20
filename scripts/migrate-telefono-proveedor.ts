import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(client);

  await db.execute(sql`
    ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS telefono text
  `);

  console.log('✓ Columna "telefono" agregada a proveedores');
  await client.end();
}

main().catch(console.error);
