/**
 * Extiende el trial de un tenant (beta testers): fija status 'trial' y corre
 * trial_end N días desde HOY. Pensado para la beta cerrada mientras no hay
 * cobro automático.
 *
 * Uso:
 *   npx tsx scripts/extender-trial.ts <email-del-owner> [dias] [envFile]
 *   npx tsx scripts/extender-trial.ts cliente@gmail.com 90 .env.vercel
 *
 * Default: 90 días, .env.vercel (DB de PRODUCCIÓN).
 */
import { readFileSync } from 'node:fs';
import postgres from 'postgres';

const [, , email, diasArg = '90', envFile = '.env.vercel'] = process.argv;
if (!email) {
  console.error('Uso: npx tsx scripts/extender-trial.ts <email> [dias=90] [envFile=.env.vercel]');
  process.exit(1);
}
const dias = Number(diasArg);
if (!Number.isFinite(dias) || dias <= 0 || dias > 365) {
  console.error(`Días inválidos: ${diasArg} (1-365)`);
  process.exit(1);
}

async function main() {
  const m = readFileSync(envFile, 'utf8').match(/^DATABASE_URL=["']?([^"'\r\n]+)/m);
  if (!m) { console.error(`No hay DATABASE_URL en ${envFile}`); process.exit(1); }
  const sql = postgres(m[1]!, { prepare: false, max: 1 });

  const hasta = new Date();
  hasta.setDate(hasta.getDate() + dias);

  const rows = await sql`
    UPDATE tenants
    SET status = 'trial', trial_end = ${hasta}
    WHERE id IN (
      SELECT ut.tenant_id FROM users_tenants ut
      JOIN users u ON u.id = ut.user_id
      WHERE lower(u.email) = lower(${email})
    )
    RETURNING nombre, plan, status, trial_end
  `;

  if (rows.length === 0) {
    console.error(`No se encontró ningún tenant para ${email}`);
  } else {
    for (const r of rows) {
      console.log(`✅ ${r.nombre} (${r.plan}) → trial hasta ${new Date(r.trial_end as string).toLocaleDateString('es-AR')}`);
    }
  }
  await sql.end();
}

main();
