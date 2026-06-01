import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const EMAIL = 'demo-prestamista@gesto.app';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

async function main() {
  const { data } = await supabase.auth.admin.listUsers();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = data?.users?.find((x: any) => x.email === EMAIL);
  console.log('AUTH user:', u ? { id: u.id, email: u.email, confirmed: u.email_confirmed_at ? 'yes' : 'NO', created: u.created_at } : 'NO EXISTE');

  const rows = await sql`
    SELECT u.id as user_id, u.email, t.id as tenant_id, t.nombre, t.plan, t.status, t.trial_end, ut.rol
    FROM users u
    LEFT JOIN users_tenants ut ON ut.user_id = u.id
    LEFT JOIN tenants t ON t.id = ut.tenant_id
    WHERE u.email = ${EMAIL}`;
  console.log('DB rows:', rows);

  // Probar login real con la anon key
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '', {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signin, error } = await anon.auth.signInWithPassword({ email: EMAIL, password: 'demo1234' });
  console.log('SIGNIN demo1234:', error ? `ERROR: ${error.message}` : `OK user ${signin.user?.id}`);

  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
