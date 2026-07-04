/**
 * Test de humo de RLS contra la DB indicada (default .env.staging).
 *
 *   node scripts/test-rls.mjs [.env.staging]
 *
 * Crea (si no existe) un rol NOLOGIN sin BYPASSRLS, y dentro de una
 * transacción usa SET LOCAL ROLE para evaluar las policies como las verá
 * `gesto_app` tras el cutover:
 *   1. Sin app.tenant_id  → fail-closed: 0 filas en tablas tenant-scoped.
 *   2. Con app.tenant_id  → solo filas de ese tenant.
 * Todo dentro de transacciones con ROLLBACK: no deja rastros de datos.
 */
import postgres from 'postgres';
import { readFileSync } from 'node:fs';

const envFile = process.argv[2] ?? '.env.staging';
const url = readFileSync(envFile, 'utf8').match(/^DATABASE_URL=["']?([^"'\r\n]+)/m)?.[1];
if (!url) { console.error(`No hay DATABASE_URL en ${envFile}`); process.exit(1); }

const sql = postgres(url, { prepare: false, max: 1 });
let fallas = 0;
const check = (nombre, ok, detalle = '') => {
  console.log(`${ok ? '✅' : '❌'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallas++;
};

try {
  // Rol de prueba sin privilegios especiales (idempotente).
  await sql.unsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rls_smoke_test') THEN
        CREATE ROLE rls_smoke_test NOLOGIN NOBYPASSRLS;
      END IF;
    END $$;
    GRANT USAGE ON SCHEMA public TO rls_smoke_test;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO rls_smoke_test;
    -- En Supabase, postgres necesita ser miembro del rol para poder SET ROLE.
    GRANT rls_smoke_test TO postgres;
  `);

  // Datos de referencia (como postgres, bypass): tenants y conteos reales.
  const tenants = await sql`SELECT id, nombre FROM tenants LIMIT 2`;
  if (tenants.length === 0) {
    console.log('⚠️ DB sin tenants — solo se valida fail-closed.');
  }
  const [{ n: totalClientes }] = await sql`SELECT count(*)::int AS n FROM clientes`;

  // 1) Fail-closed: sin contexto, el rol restringido no ve nada.
  await sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL ROLE rls_smoke_test`);
    const [{ n }] = await tx`SELECT count(*)::int AS n FROM clientes`;
    check('fail-closed sin app.tenant_id (clientes = 0)', n === 0, `vio ${n} de ${totalClientes}`);
    const [{ n: nt }] = await tx`SELECT count(*)::int AS n FROM tenants`;
    check('fail-closed sin app.tenant_id (tenants = 0)', nt === 0, `vio ${nt}`);
  });

  // 2) Aislamiento por tenant.
  for (const t of tenants) {
    const [{ n: reales }] = await sql`SELECT count(*)::int AS n FROM clientes WHERE tenant_id = ${t.id}`;
    await sql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL ROLE rls_smoke_test`);
      await tx`SELECT set_config('app.tenant_id', ${t.id}, true)`;
      const [{ n }] = await tx`SELECT count(*)::int AS n FROM clientes`;
      check(`aislamiento clientes de "${t.nombre}"`, n === reales, `vio ${n}, esperaba ${reales}`);
      const [{ n: nt }] = await tx`SELECT count(*)::int AS n FROM tenants`;
      check(`tenants visible solo el propio ("${t.nombre}")`, nt === 1, `vio ${nt}`);
      // Cross-check: no ve clientes de otros tenants.
      const [{ n: ajenos }] = await tx`SELECT count(*)::int AS n FROM clientes WHERE tenant_id != ${t.id}`;
      check(`cero filas ajenas ("${t.nombre}")`, ajenos === 0, `vio ${ajenos}`);
    });
  }

  console.log(fallas === 0 ? '\nRLS OK: todas las pruebas pasaron.' : `\n${fallas} pruebas FALLARON.`);
  process.exit(fallas === 0 ? 0 : 1);
} finally {
  await sql.end();
}
