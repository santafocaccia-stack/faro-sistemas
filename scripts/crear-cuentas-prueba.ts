/**
 * Crea 2 cuentas de prueba para compartir con conocidos:
 *  - prueba01-servicios@gesto.app  → plan servicios
 *  - prueba01-prestamos@gesto.app  → plan prestamista (Préstamos)
 *
 * Ambas en estado 'trial' con vencimiento a 30 días. Arrancan limpias
 * (solo el cliente obligatorio "Consumidor Final") para que el usuario
 * cargue sus propios datos.
 *
 * Uso: npx tsx scripts/crear-cuentas-prueba.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { tenants, users, usersTenants, clientes } from '../src/server/db/schema';
import type { PlanId } from '../src/lib/planes';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY!;
const DATABASE_URL = process.env.DATABASE_URL!;

const PASSWORD = 'prueba1234';

const CUENTAS: { email: string; plan: PlanId; nombre: string; slug: string }[] = [
  { email: 'prueba01-servicios@gesto.app', plan: 'servicios', nombre: 'Prueba Servicios', slug: 'prueba01-servicios' },
  { email: 'prueba01-prestamos@gesto.app', plan: 'prestamista', nombre: 'Prueba Préstamos', slug: 'prueba01-prestamos' },
];

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const sql = postgres(DATABASE_URL, { prepare: false });
  const db = drizzle(sql);

  const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días

  for (const c of CUENTAS) {
    console.log(`\n📦 Creando ${c.email} (${c.plan})…`);

    // Borrar usuario auth anterior si existe
    const { data: existing } = await supabase.auth.admin.listUsers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prev = existing?.users?.find((u: any) => u.email === c.email);
    if (prev) {
      await supabase.auth.admin.deleteUser(prev.id);
      console.log('  ♻️  auth anterior eliminado');
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: c.email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (authError || !authData.user) throw new Error(`Auth: ${authError?.message}`);
    const userId = authData.user.id;

    // Limpiar DB anterior (cascada borra el tenant y sus datos)
    await sql`
      DELETE FROM tenants WHERE id IN (
        SELECT ut.tenant_id FROM users_tenants ut
        JOIN users u ON u.id = ut.user_id WHERE u.email = ${c.email}
      )`;
    await sql`DELETE FROM users_tenants WHERE user_id IN (SELECT id FROM users WHERE email = ${c.email})`;
    await sql`DELETE FROM users WHERE email = ${c.email}`;

    await db.transaction(async (tx) => {
      const [tenant] = await tx
        .insert(tenants)
        .values({
          nombre: c.nombre,
          slug: `${c.slug}-${Date.now()}`,
          plan: c.plan,
          status: 'trial',
          trialEnd,
          habilitaMayorista: false,
          habilitaMinorista: true,
        })
        .returning({ id: tenants.id });
      if (!tenant) throw new Error('No se creó el tenant');

      await tx.insert(users).values({ id: userId, email: c.email });
      await tx.insert(usersTenants).values({ userId, tenantId: tenant.id, rol: 'owner' });

      // Cliente obligatorio
      await tx.insert(clientes).values({
        tenantId: tenant.id,
        razonSocial: 'Consumidor Final',
        tipo: 'minorista',
        condicionIva: 'consumidor_final',
        esConsumidorFinal: true,
        habilitaCuentaCorriente: false,
      });
    });

    console.log(`  ✅ ${c.nombre} — trial hasta ${trialEnd.toLocaleDateString('es-AR')}`);
  }

  await sql.end();

  console.log('\n' + '='.repeat(55));
  console.log('\n✨ Cuentas de prueba (trial 30 días):\n');
  for (const c of CUENTAS) {
    console.log(`  📧 ${c.email}`);
    console.log(`  🔑 ${PASSWORD}\n`);
  }
  console.log('  🌐 https://faro-sistemas.vercel.app/login');
  console.log(`  📅 Vencen: ${trialEnd.toLocaleDateString('es-AR')}`);
}

main().catch((e) => {
  console.error('\n❌ Error:', e);
  process.exit(1);
});
