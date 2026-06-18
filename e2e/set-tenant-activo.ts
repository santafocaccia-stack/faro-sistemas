/**
 * Pone un tenant en status='activo' con trialEnd=null (sin vencimiento).
 * Uso: npx tsx --env-file=.env.prod-temp e2e/set-tenant-activo.ts <tenant-id>
 */
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
const tenantId = process.argv[2];
if (!tenantId) { console.error('Falta tenant-id'); process.exit(1); }
async function main() {
  await sql`UPDATE tenants SET status = 'activo', trial_end = NULL WHERE id = ${tenantId}`;
  const [t] = await sql<{ nombre: string; status: string; trial_end: Date | null }[]>`
    SELECT nombre, status, trial_end FROM tenants WHERE id = ${tenantId}
  `;
  console.log(`Tenant actualizado: ${t?.nombre} → status=${t?.status}, trial_end=${t?.trial_end ?? 'NULL (sin vencimiento)'}`);
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
