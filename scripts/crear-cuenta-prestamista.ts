/**
 * (1) Revierte la cuenta demo-food@gesto.app al plan 'food' (Burger Bros),
 *     por si quedó en 'prestamista' tras el QA.
 * (2) Crea la cuenta demo del nuevo plan: demo-prestamista@gesto.app.
 *     Tenant + deudores (clientes) + 2 préstamos sembrados con su cronograma,
 *     reutilizando el motor de cálculo real (generarCronograma).
 *
 * Uso: npx tsx scripts/crear-cuenta-prestamista.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import {
  tenants,
  users,
  usersTenants,
  clientes,
  prestamos,
  cuotas,
} from '../src/server/db/schema';
import { generarCronograma } from '../src/lib/prestamos';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY!;
const DATABASE_URL = process.env.DATABASE_URL!;

const EMAIL = 'demo-prestamista@gesto.app';
const PASSWORD = 'demo1234';

// ── Deudores demo ────────────────────────────────────────────────────────────
const DEUDORES = [
  {
    razonSocial: 'Juan Pérez',
    tipo: 'minorista' as const,
    condicionIva: 'consumidor_final' as const,
    telefono: '15-5123-4567',
    habilitaCuentaCorriente: false,
  },
  {
    razonSocial: 'María González',
    tipo: 'minorista' as const,
    condicionIva: 'consumidor_final' as const,
    telefono: '15-6234-5678',
    habilitaCuentaCorriente: false,
  },
  {
    razonSocial: 'Comercial del Norte SRL',
    tipo: 'mayorista' as const,
    condicionIva: 'responsable_inscripto' as const,
    cuit: '30-71234560-1',
    telefono: '011-4500-1111',
    habilitaCuentaCorriente: false,
  },
];

// Préstamos demo: se asignan a los primeros deudores tras crearlos.
const PRESTAMOS_DEMO = [
  {
    deudorIdx: 0, // Juan Pérez
    capital: 100000,
    tasaNominalAnualPct: 120,
    cantidadCuotas: 12,
    frecuencia: 'mensual' as const,
    sistema: 'frances' as const,
    tasaPunitoriaAnual: '180',
    diasGracia: 3,
    // primer vencimiento ~1 mes atrás para que se vea un préstamo en curso
    mesesPrimerVtoDesdeHoy: -1,
  },
  {
    deudorIdx: 2, // Comercial del Norte SRL
    capital: 500000,
    tasaNominalAnualPct: 96,
    cantidadCuotas: 6,
    frecuencia: 'mensual' as const,
    sistema: 'frances' as const,
    tasaPunitoriaAnual: '150',
    diasGracia: 5,
    mesesPrimerVtoDesdeHoy: 1,
  },
];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log('🚀 Setup cuenta prestamista + revert food\n');
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const sql = postgres(DATABASE_URL, { prepare: false });
  const db = drizzle(sql);

  // ── (1) Revertir Burger Bros / demo-food al plan 'food' ──────────────────
  const foodRes = await sql`
    UPDATE tenants SET plan = 'food'
    WHERE id IN (
      SELECT t.id FROM tenants t
      JOIN users_tenants ut ON ut.tenant_id = t.id
      JOIN users u ON u.id = ut.user_id
      WHERE u.email = 'demo-food@gesto.app'
    )
    RETURNING nombre, plan
  `;
  if (foodRes.length > 0) {
    console.log(`♻️  Revertido: ${foodRes[0]!.nombre} → plan '${foodRes[0]!.plan}'`);
  } else {
    console.log('ℹ️  No se encontró demo-food@gesto.app (nada que revertir)');
  }

  // ── (2) Crear cuenta prestamista ─────────────────────────────────────────
  console.log(`\n📦 Creando cuenta prestamista (${EMAIL})...`);

  // Auth: borrar anterior si existe
  const { data: existing } = await supabase.auth.admin.listUsers();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prev = existing?.users?.find((u: any) => u.email === EMAIL);
  if (prev) {
    await supabase.auth.admin.deleteUser(prev.id);
    console.log('  ♻️  Usuario auth anterior eliminado');
  }
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (authError || !authData.user) throw new Error(`Auth: ${authError?.message}`);
  const userId = authData.user.id;
  console.log(`  ✅ Auth: ${EMAIL}`);

  // Limpiar DB anterior (cascada borra prestamos/cuotas por el tenant)
  await sql`
    DELETE FROM tenants WHERE id IN (
      SELECT ut.tenant_id FROM users_tenants ut
      JOIN users u ON u.id = ut.user_id
      WHERE u.email = ${EMAIL}
    )
  `;
  await sql`DELETE FROM users_tenants WHERE user_id IN (SELECT id FROM users WHERE email = ${EMAIL})`;
  await sql`DELETE FROM users WHERE email = ${EMAIL}`;

  const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.transaction(async (tx) => {
    const [tenant] = await tx
      .insert(tenants)
      .values({
        nombre: 'Créditos La Confianza',
        slug: `creditos-confianza-${Date.now()}`,
        plan: 'prestamista',
        status: 'activo',
        trialEnd,
        habilitaMayorista: false,
        habilitaMinorista: true,
      })
      .returning({ id: tenants.id });
    if (!tenant) throw new Error('No se creó el tenant');
    const tenantId = tenant.id;

    await tx.insert(users).values({ id: userId, email: EMAIL });
    await tx.insert(usersTenants).values({ userId, tenantId, rol: 'owner' });

    // Consumidor Final (obligatorio en todo tenant)
    await tx.insert(clientes).values({
      tenantId,
      razonSocial: 'Consumidor Final',
      tipo: 'minorista',
      condicionIva: 'consumidor_final',
      esConsumidorFinal: true,
      habilitaCuentaCorriente: false,
    });

    // Deudores
    const deudoresInsertados = await tx
      .insert(clientes)
      .values(DEUDORES.map((d) => ({ tenantId, ...d })))
      .returning({ id: clientes.id });

    // Préstamos + cronograma
    for (const p of PRESTAMOS_DEMO) {
      const deudor = deudoresInsertados[p.deudorIdx];
      if (!deudor) continue;
      const hoy = new Date();
      const fechaPrimerVto = new Date(hoy);
      fechaPrimerVto.setMonth(fechaPrimerVto.getMonth() + p.mesesPrimerVtoDesdeHoy);
      const fechaOtorg = new Date(fechaPrimerVto);
      fechaOtorg.setMonth(fechaOtorg.getMonth() - 1);

      const cron = generarCronograma({
        capital: p.capital,
        tasaNominalAnualPct: p.tasaNominalAnualPct,
        cantidadCuotas: p.cantidadCuotas,
        frecuencia: p.frecuencia,
        sistema: p.sistema,
        fechaPrimerVencimiento: fechaPrimerVto,
      });

      const [prestamo] = await tx
        .insert(prestamos)
        .values({
          tenantId,
          clienteId: deudor.id,
          estado: 'vigente',
          sistema: p.sistema,
          capital: String(p.capital),
          tasaNominalAnual: p.tasaNominalAnualPct.toString(),
          frecuencia: p.frecuencia,
          cantidadCuotas: p.cantidadCuotas,
          fechaOtorgamiento: isoDate(fechaOtorg),
          fechaPrimerVencimiento: isoDate(fechaPrimerVto),
          tasaPunitoriaAnual: p.tasaPunitoriaAnual,
          diasGracia: p.diasGracia,
        })
        .returning({ id: prestamos.id });
      if (!prestamo) continue;

      await tx.insert(cuotas).values(
        cron.map((c) => ({
          tenantId,
          prestamoId: prestamo.id,
          numero: c.numero,
          vencimiento: isoDate(c.vencimiento),
          montoCuota: c.montoCuota.toFixed(2),
          capital: c.capital.toFixed(2),
          interes: c.interes.toFixed(2),
          saldoPosterior: c.saldoPosterior.toFixed(2),
          estado: 'pendiente' as const,
        })),
      );
      console.log(
        `  💰 Préstamo $${p.capital.toLocaleString('es-AR')} → ${DEUDORES[p.deudorIdx]!.razonSocial} (${p.cantidadCuotas} cuotas)`,
      );
    }
  });

  // Sanity check
  const check = await sql`
    SELECT t.nombre, t.plan,
      (SELECT count(*) FROM clientes c WHERE c.tenant_id = t.id AND c.es_consumidor_final = false) AS deudores,
      (SELECT count(*) FROM prestamos pr WHERE pr.tenant_id = t.id) AS prestamos
    FROM tenants t
    JOIN users_tenants ut ON ut.tenant_id = t.id
    JOIN users u ON u.id = ut.user_id
    WHERE u.email = ${EMAIL}
  `;
  console.log('\n✅ Cuenta creada:', check[0]);

  await sql.end();

  console.log('\n' + '='.repeat(55));
  console.log('\n✨ Listo. Cuenta demo del plan PRESTAMISTA:\n');
  console.log(`  📧 ${EMAIL}`);
  console.log(`  🔑 ${PASSWORD}`);
  console.log(`  🌐 https://faro-sistemas-gold.vercel.app/login\n`);
}

main().catch((e) => {
  console.error('\n❌ Error:', e);
  process.exit(1);
});
