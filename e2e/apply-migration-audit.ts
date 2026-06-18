/**
 * Crea la tabla audit_logs en staging.
 * Uso: npx tsx --env-file=.env.local e2e/apply-migration-audit.ts
 */
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

async function main() {
  console.log('Creando tabla audit_logs...');
  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
      accion      text NOT NULL,
      entidad     text NOT NULL,
      entidad_id  uuid,
      before      jsonb,
      after       jsonb,
      meta        jsonb,
      creado_at   timestamp with time zone NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_tenant        ON audit_logs (tenant_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_tenant_accion ON audit_logs (tenant_id, accion)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_tenant_fecha  ON audit_logs (tenant_id, creado_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_entidad       ON audit_logs (entidad, entidad_id)`;
  console.log('audit_logs creada correctamente.');
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
