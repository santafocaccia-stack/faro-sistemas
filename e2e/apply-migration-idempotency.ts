/**
 * Crea la tabla idempotency_keys en staging.
 * Uso: npx tsx --env-file=.env.local e2e/apply-migration-idempotency.ts
 */
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

async function main() {
  console.log('Creando tabla idempotency_keys...');
  await sql`
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      key         text NOT NULL,
      operacion   text NOT NULL,
      resultado   jsonb,
      creado_at   timestamp with time zone NOT NULL DEFAULT now(),
      expira_at   timestamp with time zone NOT NULL,
      CONSTRAINT uniq_idempotency_tenant_key UNIQUE (tenant_id, key)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_idempotency_tenant ON idempotency_keys (tenant_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_idempotency_expira ON idempotency_keys (expira_at)`;
  console.log('idempotency_keys creada correctamente.');
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
