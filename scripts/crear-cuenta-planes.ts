/**
 * Crea una cuenta con el trial vencido para poder ver la página de planes (/planes).
 * Uso: npx tsx scripts/crear-cuenta-planes.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { tenants, users, usersTenants } from '../src/server/db/schema';

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY!;
const DATABASE_URL     = process.env.DATABASE_URL!;

const EMAIL    = 'planes@gesto.app';
const PASSWORD = 'planes1234';

async function main() {
  console.log('🚀 Creando cuenta con trial vencido...\n');

  // ── 1. Auth ──────────────────────────────────────────────
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing } = await supabase.auth.admin.listUsers();
  const existingUser = existing?.users?.find((u) => u.email === EMAIL);
  if (existingUser) {
    await supabase.auth.admin.deleteUser(existingUser.id);
    console.log('  ♻️  Cuenta anterior eliminada');
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    console.error('❌ Error creando usuario auth:', authError);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`  ✅ Usuario auth: ${EMAIL}`);

  // ── 2. DB ────────────────────────────────────────────────
  const sql = postgres(DATABASE_URL, { prepare: false });
  const db  = drizzle(sql);

  // Limpiar registros anteriores
  await sql`
    DELETE FROM users_tenants
    WHERE user_id IN (SELECT id FROM users WHERE email = ${EMAIL})
  `;
  await sql`DELETE FROM users WHERE email = ${EMAIL}`;

  // Tenant con trial VENCIDO (hace 2 días)
  const trialEnd = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // hace 2 días

  const [tenant] = await db.insert(tenants).values({
    nombre:             'Negocio Demo',
    slug:               `negocio-demo-${Date.now()}`,
    habilitaMayorista:  true,
    habilitaMinorista:  true,
    plan:               'market',
    status:             'trial',
    trialEnd,
  }).returning({ id: tenants.id });

  if (!tenant) throw new Error('No se pudo crear el tenant');

  const [user] = await db.insert(users).values({
    id:    userId,
    email: EMAIL,
  }).returning({ id: users.id });

  if (!user) throw new Error('No se pudo crear el usuario');

  await db.insert(usersTenants).values({
    userId:   user.id,
    tenantId: tenant.id,
    rol:      'owner',
  });

  console.log(`  ✅ Tenant "Negocio Demo" creado con trial vencido`);
  await sql.end();

  console.log('\n✨ ¡Listo! Credenciales:\n');
  console.log(`   📧 Email:    ${EMAIL}`);
  console.log(`   🔑 Password: ${PASSWORD}`);
  console.log(`   🌐 URL:      https://faro-sistemas.vercel.app/login`);
  console.log('\n   Al ingresar verá automáticamente la pantalla de planes.');
}

main().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
