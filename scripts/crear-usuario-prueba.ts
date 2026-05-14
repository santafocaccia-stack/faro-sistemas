/**
 * Crea un usuario de prueba con datos demo en la base de datos.
 * Uso: npx tsx scripts/crear-usuario-prueba.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  tenants, users, usersTenants, clientes, productos,
} from '../src/server/db/schema';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY!;
const DATABASE_URL = process.env.DATABASE_URL!;

const DEMO_EMAIL = 'prueba@gesto.app';
const DEMO_PASSWORD = 'prueba1234';

async function main() {
  console.log('🚀 Creando usuario de prueba...\n');

  // ── 1. Supabase Admin Client ─────────────────────────────
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Eliminar si ya existe
  const { data: existing } = await supabase.auth.admin.listUsers();
  const existingUser = existing?.users?.find((u) => u.email === DEMO_EMAIL);
  if (existingUser) {
    await supabase.auth.admin.deleteUser(existingUser.id);
    console.log('  ♻️  Usuario anterior eliminado');
  }

  // Crear el usuario sin confirmación de email
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    console.error('❌ Error creando usuario auth:', authError);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`  ✅ Usuario auth creado: ${DEMO_EMAIL}`);

  // ── 2. Drizzle DB ────────────────────────────────────────
  const sql = postgres(DATABASE_URL, { prepare: false });
  const db = drizzle(sql);

  // ── 3. Limpiar registros anteriores en DB ───────────────
  // Borra en cascada: users → users_tenants → (tenant queda huérfano, limpiamos también)
  await sql`
    DELETE FROM users_tenants
    WHERE user_id IN (SELECT id FROM users WHERE email = ${DEMO_EMAIL})
  `;
  await sql`DELETE FROM users WHERE email = ${DEMO_EMAIL}`;

  // ── 4. Crear usuario en tabla propia ─────────────────────
  await sql`INSERT INTO users (id, email) VALUES (${userId}, ${DEMO_EMAIL})`;
  console.log('  ✅ Usuario en tabla users creado');

  await db.transaction(async (tx) => {
    const [tenant] = await tx.insert(tenants).values({
      nombre: 'La Demo Carnicería',
      slug: `demo-carniceria-${Date.now()}`,
      habilitaMayorista: true,
      habilitaMinorista: true,
    }).returning({ id: tenants.id });

    if (!tenant) throw new Error('Error al crear tenant');
    const tenantId = tenant.id;

    // Vincularlo como owner
    await tx.insert(usersTenants).values({ userId, tenantId, rol: 'owner' });

    // Consumidor Final obligatorio
    await tx.insert(clientes).values({
      tenantId,
      razonSocial: 'Consumidor Final',
      tipo: 'minorista',
      condicionIva: 'consumidor_final',
      esConsumidorFinal: true,
      habilitaCuentaCorriente: false,
    });

    // Clientes demo
    await tx.insert(clientes).values([
      {
        tenantId,
        razonSocial: 'Supermercado El Sol',
        nombreFantasia: 'El Sol',
        tipo: 'mayorista',
        condicionIva: 'responsable_inscripto',
        cuit: '30-71234567-8',
        telefono: '011-4567-8901',
        habilitaCuentaCorriente: true,
        limiteCredito: '150000',
        saldoActual: '0',
      },
      {
        tenantId,
        razonSocial: 'Juan Pérez',
        tipo: 'minorista',
        condicionIva: 'consumidor_final',
        telefono: '15-6234-5678',
        habilitaCuentaCorriente: false,
        saldoActual: '0',
      },
    ]);

    // Productos demo — stock en kg (ej: 8.500 = 8 kg 500 g)
    await tx.insert(productos).values([
      {
        tenantId,
        nombre: 'Bola de lomo',
        categoria: 'Vacuno',
        tipoUnidad: 'por_kg',
        stockActual: '8.500',
        stockMinimo: '2.000',
        costoPromedio: '3800',
        precioMayorista: '5200',
        precioMinorista: '6800',
        activo: true,
      },
      {
        tenantId,
        nombre: 'Nalga',
        categoria: 'Vacuno',
        tipoUnidad: 'por_kg',
        stockActual: '11.200',
        stockMinimo: '2.000',
        costoPromedio: '3500',
        precioMayorista: '4800',
        precioMinorista: '6200',
        activo: true,
      },
      {
        tenantId,
        nombre: 'Vacío',
        categoria: 'Vacuno',
        tipoUnidad: 'por_kg',
        stockActual: '9.800',
        stockMinimo: '2.000',
        costoPromedio: '3200',
        precioMayorista: '4500',
        precioMinorista: '5900',
        activo: true,
      },
      {
        tenantId,
        nombre: 'Asado de tira',
        categoria: 'Vacuno',
        tipoUnidad: 'por_kg',
        stockActual: '14.600',
        stockMinimo: '3.000',
        costoPromedio: '2900',
        precioMayorista: '4200',
        precioMinorista: '5500',
        activo: true,
      },
      {
        tenantId,
        nombre: 'Pechuga de pollo',
        categoria: 'Pollo',
        tipoUnidad: 'por_kg',
        stockActual: '7.400',
        stockMinimo: '2.000',
        costoPromedio: '2100',
        precioMayorista: '3000',
        precioMinorista: '3800',
        activo: true,
      },
      {
        tenantId,
        nombre: 'Pollo entero',
        categoria: 'Pollo',
        tipoUnidad: 'por_kg',
        stockActual: '12.000',
        stockMinimo: '3.000',
        costoPromedio: '1800',
        precioMayorista: '2600',
        precioMinorista: '3200',
        activo: true,
      },
      {
        tenantId,
        nombre: 'Bondiola de cerdo',
        categoria: 'Cerdo',
        tipoUnidad: 'por_kg',
        stockActual: '8.200',
        stockMinimo: '2.000',
        costoPromedio: '3100',
        precioMayorista: '4400',
        precioMinorista: '5700',
        activo: true,
      },
      {
        tenantId,
        nombre: 'Chorizo parrillero',
        categoria: 'Embutidos',
        tipoUnidad: 'por_unidad',
        stockActual: '48',
        stockMinimo: '12',
        costoPromedio: '650',
        precioMayorista: '900',
        precioMinorista: '1100',
        activo: true,
      },
      {
        tenantId,
        nombre: 'Morcilla',
        categoria: 'Embutidos',
        tipoUnidad: 'por_unidad',
        stockActual: '36',
        stockMinimo: '10',
        costoPromedio: '550',
        precioMayorista: '780',
        precioMinorista: '950',
        activo: true,
      },
    ]);

    console.log(`  ✅ Tenant "La Demo Carnicería" creado (id: ${tenantId})`);
    console.log('  ✅ 2 clientes de ejemplo cargados');
    console.log('  ✅ 9 productos de ejemplo cargados');
  });

  await sql.end();

  console.log('\n✨ ¡Listo! Usuario de prueba creado:\n');
  console.log(`   📧 Email:    ${DEMO_EMAIL}`);
  console.log(`   🔑 Password: ${DEMO_PASSWORD}`);
  console.log(`   🌐 URL:      https://faro-sistemas-gold.vercel.app/login\n`);
}

main().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
