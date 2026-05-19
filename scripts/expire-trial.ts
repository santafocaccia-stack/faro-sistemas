import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const ACTION = process.argv[2]; // "expire" o "reset"
const TENANT_ID = process.argv[3]; // UUID del tenant

if (!ACTION || !TENANT_ID) {
  console.log('Uso: npx tsx scripts/expire-trial.ts [expire|reset] [tenant-id]');
  process.exit(1);
}

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(client);

  if (ACTION === 'expire') {
    await db.execute(sql`UPDATE tenants SET trial_end = NOW() - INTERVAL '1 day' WHERE id = ${TENANT_ID}`);
    console.log(`✓ Trial expirado para tenant ${TENANT_ID}`);
  } else if (ACTION === 'reset') {
    await db.execute(sql`UPDATE tenants SET trial_end = NOW() + INTERVAL '14 days' WHERE id = ${TENANT_ID}`);
    console.log(`✓ Trial reseteado (14 días) para tenant ${TENANT_ID}`);
  }

  await client.end();
}

main().catch(console.error);
