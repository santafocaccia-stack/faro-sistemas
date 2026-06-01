/**
 * Deja las 5 cuentas demo en estado 'activo' y con vencimiento lejano,
 * para poder probar sin que caduque la prueba.
 *
 * Uso: npx tsx scripts/demo-no-expira.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL!;

const EMAILS = [
  'demo-servicios@gesto.app',
  'demo-market@gesto.app',
  'demo-food@gesto.app',
  'demo-balanza@gesto.app',
  'demo-prestamista@gesto.app',
];

async function main() {
  const sql = postgres(DATABASE_URL, { prepare: false });
  console.log('🔧 Dejando cuentas demo sin vencimiento…\n');

  const rows = await sql`
    UPDATE tenants
    SET status = 'activo', trial_end = '2099-12-31'::timestamptz
    WHERE id IN (
      SELECT ut.tenant_id FROM users_tenants ut
      JOIN users u ON u.id = ut.user_id
      WHERE u.email = ANY(${EMAILS})
    )
    RETURNING nombre, plan, status, trial_end
  `;

  for (const r of rows) {
    console.log(`  ✅ ${String(r.plan).padEnd(11)} ${r.nombre} → ${r.status} (vence ${new Date(r.trial_end).getFullYear()})`);
  }
  console.log(`\n✨ ${rows.length} cuentas actualizadas.`);
  await sql.end();
}

main().catch((e) => {
  console.error('\n❌ Error:', e);
  process.exit(1);
});
