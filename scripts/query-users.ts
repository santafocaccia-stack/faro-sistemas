import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(client);

  const rows = await db.execute(sql`
    SELECT u.email, t.nombre, t.id, t.status, t.trial_end
    FROM auth.users u
    JOIN public.users_tenants ut ON ut.user_id = u.id
    JOIN public.tenants t ON t.id = ut.tenant_id
    ORDER BY t.created_at DESC
  `);

  console.log(JSON.stringify(rows, null, 2));
  await client.end();
}

main().catch(console.error);
