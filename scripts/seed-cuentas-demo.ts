/**
 * Crea 4 cuentas de prueba, una por plan (servicios, market, food, balanza).
 * Cada cuenta tiene datos demo realistas, status 'activo' y trial en 30 días.
 *
 * Uso: npx tsx scripts/seed-cuentas-demo.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { tenants, users, usersTenants, clientes, productos } from '../src/server/db/schema';
import type { PlanId } from '../src/lib/planes';
import type { CondicionIva } from '../src/server/db/schema';

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY!;
const DATABASE_URL     = process.env.DATABASE_URL!;

// ── Definición de las 4 cuentas ────────────────────────────────────────────

type CuentaConfig = {
  email: string;
  password: string;
  plan: PlanId;
  negocioNombre: string;
  negocioSlug: string;
  descripcion: string;
  habilitaMayorista: boolean;
  habilitaMinorista: boolean;
  clientesDemo: Array<{
    razonSocial: string;
    nombreFantasia?: string;
    tipo: 'minorista' | 'mayorista';
    condicionIva: CondicionIva;
    cuit?: string;
    telefono?: string;
    habilitaCuentaCorriente: boolean;
    limiteCredito?: string;
  }>;
  productosDemo: Array<{
    nombre: string;
    tipoUnidad: 'por_kg' | 'por_unidad';
    stockActual: string;
    stockMinimo: string;
    costoPromedio: string;
    precioMayorista: string;
    precioMinorista: string;
  }>;
};

const CUENTAS: CuentaConfig[] = [
  /* ── 1. Servicios ─────────────────────────────── */
  {
    email: 'demo-servicios@gesto.app',
    password: 'demo1234',
    plan: 'servicios',
    negocioNombre: 'Estudio Contable López',
    negocioSlug: `estudio-lopez-${Date.now()}`,
    descripcion: 'Prestador de servicios / contador',
    habilitaMayorista: false,
    habilitaMinorista: true,
    clientesDemo: [
      {
        razonSocial: 'Tecnología Sur SRL',
        tipo: 'mayorista',
        condicionIva: 'responsable_inscripto',
        cuit: '30-71234560-1',
        telefono: '011-4500-1111',
        habilitaCuentaCorriente: true,
        limiteCredito: '200000',
      },
      {
        razonSocial: 'Martín Ferreyra',
        tipo: 'minorista',
        condicionIva: 'monotributo',
        telefono: '15-5123-4567',
        habilitaCuentaCorriente: false,
      },
    ],
    productosDemo: [
      {
        nombre: 'Liquidación mensual',
        tipoUnidad: 'por_unidad',
        stockActual: '999',
        stockMinimo: '0',
        costoPromedio: '0',
        precioMayorista: '25000',
        precioMinorista: '35000',
      },
      {
        nombre: 'Asesoría impositiva (hora)',
        tipoUnidad: 'por_unidad',
        stockActual: '999',
        stockMinimo: '0',
        costoPromedio: '0',
        precioMayorista: '8000',
        precioMinorista: '12000',
      },
      {
        nombre: 'Declaración jurada anual',
        tipoUnidad: 'por_unidad',
        stockActual: '999',
        stockMinimo: '0',
        costoPromedio: '0',
        precioMayorista: '40000',
        precioMinorista: '55000',
      },
    ],
  },

  /* ── 2. Market ────────────────────────────────── */
  {
    email: 'demo-market@gesto.app',
    password: 'demo1234',
    plan: 'market',
    negocioNombre: 'Kiosco El Rincón',
    negocioSlug: `kiosco-rincon-${Date.now() + 1}`,
    descripcion: 'Kiosco / comercio general',
    habilitaMayorista: true,
    habilitaMinorista: true,
    clientesDemo: [
      {
        razonSocial: 'Distribuidora Norte',
        tipo: 'mayorista',
        condicionIva: 'responsable_inscripto',
        cuit: '30-61234567-4',
        telefono: '011-4600-2222',
        habilitaCuentaCorriente: true,
        limiteCredito: '100000',
      },
      {
        razonSocial: 'Carlos Gómez',
        tipo: 'minorista',
        condicionIva: 'consumidor_final',
        telefono: '15-4234-5678',
        habilitaCuentaCorriente: true,
        limiteCredito: '20000',
      },
    ],
    productosDemo: [
      {
        nombre: 'Coca-Cola 500ml',
        tipoUnidad: 'por_unidad',
        stockActual: '48',
        stockMinimo: '12',
        costoPromedio: '850',
        precioMayorista: '1100',
        precioMinorista: '1400',
      },
      {
        nombre: 'Agua Villavicencio 500ml',
        tipoUnidad: 'por_unidad',
        stockActual: '36',
        stockMinimo: '10',
        costoPromedio: '400',
        precioMayorista: '550',
        precioMinorista: '750',
      },
      {
        nombre: 'Alfajor Havanna',
        tipoUnidad: 'por_unidad',
        stockActual: '60',
        stockMinimo: '15',
        costoPromedio: '900',
        precioMayorista: '1200',
        precioMinorista: '1600',
      },
      {
        nombre: 'Papas Lays 90g',
        tipoUnidad: 'por_unidad',
        stockActual: '30',
        stockMinimo: '8',
        costoPromedio: '650',
        precioMayorista: '900',
        precioMinorista: '1200',
      },
      {
        nombre: 'Chicles Beldent x12',
        tipoUnidad: 'por_unidad',
        stockActual: '80',
        stockMinimo: '20',
        costoPromedio: '180',
        precioMayorista: '280',
        precioMinorista: '400',
      },
      {
        nombre: 'Cigarrillos Marlboro',
        tipoUnidad: 'por_unidad',
        stockActual: '25',
        stockMinimo: '10',
        costoPromedio: '1800',
        precioMayorista: '2200',
        precioMinorista: '2600',
      },
    ],
  },

  /* ── 3. Food ──────────────────────────────────── */
  {
    email: 'demo-food@gesto.app',
    password: 'demo1234',
    plan: 'food',
    negocioNombre: 'Burger Bros',
    negocioSlug: `burger-bros-${Date.now() + 2}`,
    descripcion: 'Hamburguesería / gastronomía',
    habilitaMayorista: false,
    habilitaMinorista: true,
    clientesDemo: [
      {
        razonSocial: 'Empresa Catering SA',
        tipo: 'mayorista',
        condicionIva: 'responsable_inscripto',
        cuit: '30-81234567-2',
        telefono: '011-4700-3333',
        habilitaCuentaCorriente: true,
        limiteCredito: '80000',
      },
    ],
    productosDemo: [
      {
        nombre: 'Hamburguesa Simple',
        tipoUnidad: 'por_unidad',
        stockActual: '999',
        stockMinimo: '0',
        costoPromedio: '1800',
        precioMayorista: '3000',
        precioMinorista: '4500',
      },
      {
        nombre: 'Hamburguesa Doble',
        tipoUnidad: 'por_unidad',
        stockActual: '999',
        stockMinimo: '0',
        costoPromedio: '2800',
        precioMayorista: '4500',
        precioMinorista: '6500',
      },
      {
        nombre: 'Papas Fritas Porción',
        tipoUnidad: 'por_unidad',
        stockActual: '999',
        stockMinimo: '0',
        costoPromedio: '600',
        precioMayorista: '1200',
        precioMinorista: '1800',
      },
      {
        nombre: 'Gaseosa 500ml',
        tipoUnidad: 'por_unidad',
        stockActual: '40',
        stockMinimo: '10',
        costoPromedio: '500',
        precioMayorista: '800',
        precioMinorista: '1200',
      },
      {
        nombre: 'Combo Simple (burger + papas + gaseosa)',
        tipoUnidad: 'por_unidad',
        stockActual: '999',
        stockMinimo: '0',
        costoPromedio: '2900',
        precioMayorista: '5000',
        precioMinorista: '7200',
      },
    ],
  },

  /* ── 4. Balanza ───────────────────────────────── */
  {
    email: 'demo-balanza@gesto.app',
    password: 'demo1234',
    plan: 'balanza',
    negocioNombre: 'Carnicería El Gaucho',
    negocioSlug: `carniceria-gaucho-${Date.now() + 3}`,
    descripcion: 'Carnicería / venta por peso',
    habilitaMayorista: true,
    habilitaMinorista: true,
    clientesDemo: [
      {
        razonSocial: 'Supermercado La Esquina',
        nombreFantasia: 'La Esquina',
        tipo: 'mayorista',
        condicionIva: 'responsable_inscripto',
        cuit: '30-71234599-5',
        telefono: '011-4567-8901',
        habilitaCuentaCorriente: true,
        limiteCredito: '150000',
      },
      {
        razonSocial: 'María González',
        tipo: 'minorista',
        condicionIva: 'consumidor_final',
        telefono: '15-6234-5678',
        habilitaCuentaCorriente: false,
      },
    ],
    productosDemo: [
      {
        nombre: 'Bola de lomo',
        tipoUnidad: 'por_kg',
        stockActual: '8.500',
        stockMinimo: '2.000',
        costoPromedio: '3800',
        precioMayorista: '5200',
        precioMinorista: '6800',
      },
      {
        nombre: 'Asado de tira',
        tipoUnidad: 'por_kg',
        stockActual: '14.600',
        stockMinimo: '3.000',
        costoPromedio: '2900',
        precioMayorista: '4200',
        precioMinorista: '5500',
      },
      {
        nombre: 'Vacío',
        tipoUnidad: 'por_kg',
        stockActual: '9.800',
        stockMinimo: '2.000',
        costoPromedio: '3200',
        precioMayorista: '4500',
        precioMinorista: '5900',
      },
      {
        nombre: 'Pechuga de pollo',
        tipoUnidad: 'por_kg',
        stockActual: '7.400',
        stockMinimo: '2.000',
        costoPromedio: '2100',
        precioMayorista: '3000',
        precioMinorista: '3800',
      },
      {
        nombre: 'Bondiola de cerdo',
        tipoUnidad: 'por_kg',
        stockActual: '8.200',
        stockMinimo: '2.000',
        costoPromedio: '3100',
        precioMayorista: '4400',
        precioMinorista: '5700',
      },
      {
        nombre: 'Chorizo parrillero',
        tipoUnidad: 'por_unidad',
        stockActual: '48',
        stockMinimo: '12',
        costoPromedio: '650',
        precioMayorista: '900',
        precioMinorista: '1100',
      },
    ],
  },
];

// ── Main ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function crearCuenta(supabase: any, db: any, sql: any, cuenta: CuentaConfig): Promise<void> {
  console.log(`\n📦 Creando cuenta "${cuenta.negocioNombre}" (plan: ${cuenta.plan})...`);

  // 1. Eliminar usuario auth anterior si existe
  const { data: existing } = await supabase.auth.admin.listUsers();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingUser = existing?.users?.find((u: any) => u.email === cuenta.email);
  if (existingUser) {
    await supabase.auth.admin.deleteUser(existingUser.id);
    console.log(`  ♻️  Usuario auth anterior eliminado`);
  }

  // 2. Crear usuario auth (email ya confirmado)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: cuenta.email,
    password: cuenta.password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    throw new Error(`Error creando usuario auth: ${authError?.message}`);
  }

  const userId = authData.user.id;
  console.log(`  ✅ Auth: ${cuenta.email}`);

  // 3. Limpiar registros DB anteriores
  await sql`
    DELETE FROM users_tenants
    WHERE user_id IN (SELECT id FROM users WHERE email = ${cuenta.email})
  `;
  await sql`DELETE FROM users WHERE email = ${cuenta.email}`;

  // 4. Crear todo en una transacción
  const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días

  await db.transaction(async (tx) => {
    // Tenant
    const [tenant] = await tx.insert(tenants).values({
      nombre: cuenta.negocioNombre,
      slug: cuenta.negocioSlug,
      plan: cuenta.plan,
      status: 'activo',
      trialEnd,
      habilitaMayorista: cuenta.habilitaMayorista,
      habilitaMinorista: cuenta.habilitaMinorista,
    }).returning({ id: tenants.id });

    if (!tenant) throw new Error('Error al crear tenant');
    const tenantId = tenant.id;

    // Usuario
    await tx.insert(users).values({ id: userId, email: cuenta.email });

    // Vincularlo como owner
    await tx.insert(usersTenants).values({ userId, tenantId, rol: 'owner' });

    // Consumidor Final (obligatorio)
    await tx.insert(clientes).values({
      tenantId,
      razonSocial: 'Consumidor Final',
      tipo: 'minorista',
      condicionIva: 'consumidor_final',
      esConsumidorFinal: true,
      habilitaCuentaCorriente: false,
    });

    // Clientes demo
    if (cuenta.clientesDemo.length > 0) {
      await tx.insert(clientes).values(
        cuenta.clientesDemo.map((c) => ({ tenantId, ...c })),
      );
    }

    // Productos demo
    if (cuenta.productosDemo.length > 0) {
      await tx.insert(productos).values(
        cuenta.productosDemo.map((p) => ({ tenantId, activo: true, ...p })),
      );
    }
  });

  console.log(`  ✅ Tenant creado con ${cuenta.clientesDemo.length} clientes y ${cuenta.productosDemo.length} productos`);
}

async function main() {
  console.log('🚀 Seed — 4 cuentas de prueba (una por plan)\n');
  console.log('='.repeat(55));

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const sql = postgres(DATABASE_URL, { prepare: false });
  const db  = drizzle(sql);

  for (const cuenta of CUENTAS) {
    await crearCuenta(supabase, db, sql, cuenta);
  }

  await sql.end();

  console.log('\n' + '='.repeat(55));
  console.log('\n✨ ¡Listo! Las 4 cuentas de prueba están creadas:\n');

  const url = 'https://faro-sistemas.vercel.app/login';
  for (const c of CUENTAS) {
    console.log(`  🏷️  ${c.plan.toUpperCase().padEnd(10)} — ${c.negocioNombre}`);
    console.log(`      📧 ${c.email}`);
    console.log(`      🔑 ${c.password}`);
    console.log(`      🌐 ${url}\n`);
  }
}

main().catch((e) => {
  console.error('\n❌ Error:', e);
  process.exit(1);
});
