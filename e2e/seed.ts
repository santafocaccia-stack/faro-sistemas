/**
 * Seed de staging: crea el usuario de prueba y su tenant en la DB.
 * Uso: npx tsx e2e/seed.ts
 */
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '../src/server/db/schema';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY!;
const DATABASE_URL = process.env.DATABASE_URL!;

const TEST_EMAIL = 'prueba@gesto.app';
const TEST_PASSWORD = 'prueba1234';

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const sql = postgres(DATABASE_URL, { prepare: false });
  const db = drizzle(sql, { schema });

  // 1. Crear usuario en Supabase Auth
  console.log('Creando usuario en Auth...');
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  if (authError && !authError.message.includes('already been registered')) {
    throw new Error(`Auth error: ${authError.message}`);
  }

  const userId = authData?.user?.id;
  if (!userId) {
    // Usuario ya existe — buscarlo
    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list?.users.find((u) => u.email === TEST_EMAIL);
    if (!existing) throw new Error('No se pudo obtener el usuario de Auth');
    console.log('Usuario ya existe en Auth, reutilizando id:', existing.id);
    await seed(db, existing.id);
  } else {
    console.log('Usuario creado en Auth:', userId);
    await seed(db, userId);
  }

  await sql.end();
  console.log('Seed completado.');
}

async function seed(db: ReturnType<typeof drizzle>, userId: string) {
  // 2. Insertar en tabla users (espejo de auth.users)
  console.log('Insertando en users...');
  await db
    .insert(schema.users)
    .values({ id: userId, email: TEST_EMAIL, nombreCompleto: 'Usuario Prueba' })
    .onConflictDoNothing();

  // 3. Crear tenant de prueba
  console.log('Creando tenant...');
  const [tenant] = await db
    .insert(schema.tenants)
    .values({
      nombre: 'Negocio de Prueba',
      slug: 'prueba',
      plan: 'market',
      status: 'activo',
    })
    .onConflictDoNothing()
    .returning();

  if (!tenant) {
    // Ya existe — buscarlo por slug
    const [existing] = await db
      .select({ id: schema.tenants.id })
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, 'prueba'))
      .limit(1);
    if (!existing) throw new Error('No se pudo obtener el tenant');
    console.log('Tenant ya existe, reutilizando:', existing.id);
    await linkUser(db, userId, existing.id);
    return;
  }

  console.log('Tenant creado:', tenant.id);
  await linkUser(db, userId, tenant.id);
}

async function linkUser(db: ReturnType<typeof drizzle>, userId: string, tenantId: string) {
  console.log('Vinculando usuario al tenant como owner...');
  await db
    .insert(schema.usersTenants)
    .values({ userId, tenantId, rol: 'owner' })
    .onConflictDoNothing();

  console.log('Insertando productos de prueba...');
  await db.insert(schema.productos).values([
    {
      tenantId,
      nombre: 'Asado de Tira',
      tipoUnidad: 'por_kg',
      precioMayorista: '4500',
      precioMinorista: '5800',
      costoPromedio: '3200',
      activo: true,
    },
    {
      tenantId,
      nombre: 'Pollo Entero',
      tipoUnidad: 'por_unidad',
      precioMayorista: '3200',
      precioMinorista: '3800',
      costoPromedio: '2100',
      activo: true,
    },
    {
      tenantId,
      nombre: 'Chorizo',
      tipoUnidad: 'por_unidad',
      precioMayorista: '1200',
      precioMinorista: '1500',
      costoPromedio: '800',
      stockActual: '50',
      activo: true,
    },
  ]).onConflictDoNothing();

  console.log('Insertando clientes de prueba...');
  await db.insert(schema.clientes).values([
    {
      tenantId,
      razonSocial: 'Juan Pérez',
      tipo: 'minorista',
      condicionIva: 'consumidor_final',
      habilitaCuentaCorriente: true,
      saldoActual: '0',
    },
    {
      tenantId,
      razonSocial: 'Supermercado El Sol',
      tipo: 'mayorista',
      condicionIva: 'responsable_inscripto',
      habilitaCuentaCorriente: true,
      saldoActual: '0',
    },
  ]).onConflictDoNothing();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
