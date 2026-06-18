/**
 * Crea el usuario atmos@gesto.app en Supabase auth y lo vincula
 * SOLAMENTE al tenant "Atmosférico Prueba" (plan=atmosfericos).
 *
 * Uso: npx tsx --env-file=.env.local e2e/create-atmos-user.ts
 */
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

const ATMOS_EMAIL = 'atmos@gesto.app';
const ATMOS_PASSWORD = 'prueba1234';

async function main() {
  // 1. Crear usuario en Supabase Auth
  console.log(`Creando usuario ${ATMOS_EMAIL}...`);
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email: ATMOS_EMAIL,
    password: ATMOS_PASSWORD,
    email_confirm: true,
  });

  if (error && !error.message.includes('already been registered')) {
    console.error('Error creando usuario:', error.message);
    process.exit(1);
  }

  // Si ya existe, obtener su ID
  let userId: string;
  if (error?.message.includes('already been registered')) {
    const [existing] = await sql<{ id: string }[]>`
      SELECT id FROM auth.users WHERE email = ${ATMOS_EMAIL} LIMIT 1
    `;
    if (!existing) { console.error('Usuario no encontrado'); process.exit(1); }
    userId = existing.id;
    console.log(`Usuario ya existe: ${userId}`);
  } else {
    userId = created!.user!.id;
    console.log(`Usuario creado: ${userId}`);
  }

  // 2. Asegurarse que está en la tabla users del app
  await sql`
    INSERT INTO users (id, email)
    VALUES (${userId}, ${ATMOS_EMAIL})
    ON CONFLICT (id) DO NOTHING
  `;

  // 3. Buscar el tenant "Atmosférico Prueba"
  const [tenant] = await sql<{ id: string }[]>`
    SELECT id FROM tenants WHERE slug = 'atmosferico-prueba' LIMIT 1
  `;
  if (!tenant) { console.error('Tenant Atmosférico Prueba no encontrado'); process.exit(1); }
  console.log(`Tenant: ${tenant.id}`);

  // 4. Vincular el usuario al tenant como owner (solo si no existe)
  await sql`
    INSERT INTO users_tenants (user_id, tenant_id, rol)
    VALUES (${userId}, ${tenant.id}, 'owner')
    ON CONFLICT DO NOTHING
  `;

  console.log(`\nListo! Usuario ${ATMOS_EMAIL} (pass: ${ATMOS_PASSWORD}) vinculado a "Atmosférico Prueba".`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
