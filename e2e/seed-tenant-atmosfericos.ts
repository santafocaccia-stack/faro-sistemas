/**
 * Crea el tenant de prueba "Atmosférico Prueba" con plan='atmosfericos'
 * y un usuario owner para testear el vertical.
 *
 * Uso: npx tsx --env-file=.env.local e2e/seed-tenant-atmosfericos.ts
 */
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

// Ajustá este email al de tu cuenta en Supabase auth
const OWNER_EMAIL = process.env.SEED_ATMOS_EMAIL ?? 'tomasemanueldesousa@gmail.com';

async function main() {
  // Buscar el usuario en auth por email (tabla auth.users de Supabase)
  const [authUser] = await sql<{ id: string }[]>`
    SELECT id FROM auth.users WHERE email = ${OWNER_EMAIL} LIMIT 1
  `;

  if (!authUser) {
    console.error(`No se encontró el usuario ${OWNER_EMAIL} en auth.users`);
    console.error('Asegurate de estar registrado con ese email en el proyecto de Supabase staging.');
    process.exit(1);
  }

  const userId = authUser.id;
  console.log(`Usuario encontrado: ${userId}`);

  // Verificar si ya existe un tenant atmosférico
  const [existing] = await sql<{ id: string }[]>`
    SELECT t.id FROM tenants t
    JOIN users_tenants ut ON ut.tenant_id = t.id
    WHERE t.plan = 'atmosfericos' AND ut.user_id = ${userId}
    LIMIT 1
  `;

  if (existing) {
    console.log(`Tenant atmosférico ya existe: ${existing.id}`);
    await sql.end();
    return;
  }

  // Insertar el tenant
  const [tenant] = await sql<{ id: string }[]>`
    INSERT INTO tenants (nombre, slug, plan, status)
    VALUES ('Atmosférico Prueba', 'atmosferico-prueba', 'atmosfericos', 'activo')
    RETURNING id
  `;

  if (!tenant) throw new Error('Error insertando tenant');
  console.log(`Tenant creado: ${tenant.id}`);

  // Verificar que el usuario existe en la tabla users del app
  const [appUser] = await sql<{ id: string }[]>`
    SELECT id FROM users WHERE id = ${userId} LIMIT 1
  `;

  if (!appUser) {
    // Insertar el usuario en la tabla users del app (con datos mínimos)
    await sql`
      INSERT INTO users (id, email)
      VALUES (${userId}, ${OWNER_EMAIL})
      ON CONFLICT (id) DO NOTHING
    `;
    console.log(`Usuario insertado en tabla users: ${userId}`);
  }

  // Vincular usuario al tenant como owner
  await sql`
    INSERT INTO users_tenants (user_id, tenant_id, rol)
    VALUES (${userId}, ${tenant.id}, 'owner')
  `;

  console.log(`Usuario vinculado al tenant como owner.`);
  console.log(`\nListo! Tenant "Atmosférico Prueba" (plan=atmosfericos) creado.`);
  console.log(`Tenant ID: ${tenant.id}`);
  console.log(`\nPara acceder: iniciá sesión y seleccioná el tenant "Atmosférico Prueba".`);

  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
