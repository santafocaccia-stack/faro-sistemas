/**
 * Migración manual: agenda (turnos + vencimientos) y plan prestamista
 * (prestamos + cuotas + pagos_prestamo). Idempotente.
 * Ejecutar: npx tsx scripts/migrate-agenda-prestamos.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL no definida en .env.local');

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 1 });

const enumDo = (name: string, values: string[]) =>
  `DO $$ BEGIN CREATE TYPE ${name} AS ENUM (${values
    .map((v) => `'${v}'`)
    .join(',')}); EXCEPTION WHEN duplicate_object THEN null; END $$`;

const statements: string[] = [
  // 1) Agregar 'prestamista' al enum de planes
  `ALTER TYPE plan_gesto ADD VALUE IF NOT EXISTS 'prestamista'`,

  // 2) Enums nuevos
  enumDo('estado_turno', ['agendado', 'confirmado', 'en_curso', 'completado', 'cancelado', 'no_asistio']),
  enumDo('tipo_vencimiento', ['monotributo_afip', 'iva', 'ganancias', 'vtv', 'seguro_rc', 'seguro_auto', 'art', 'matricula', 'habilitacion', 'certificacion', 'herramienta', 'otro']),
  enumDo('periodicidad_vencimiento', ['unico', 'mensual', 'bimestral', 'trimestral', 'semestral', 'anual']),
  enumDo('estado_ocurrencia', ['pendiente', 'pagado', 'vencido', 'omitido']),
  enumDo('sistema_amortizacion', ['frances', 'aleman', 'americano']),
  enumDo('frecuencia_pago', ['diaria', 'semanal', 'quincenal', 'mensual']),
  enumDo('estado_prestamo', ['vigente', 'en_mora', 'cancelado', 'refinanciado', 'incobrable']),
  enumDo('estado_cuota', ['pendiente', 'parcial', 'pagada', 'vencida']),

  // 3) Tablas — Agenda
  `CREATE TABLE IF NOT EXISTS turnos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
    estado estado_turno NOT NULL DEFAULT 'agendado',
    titulo text NOT NULL,
    descripcion text,
    direccion text,
    localidad text,
    inicio timestamptz NOT NULL,
    duracion_min integer NOT NULL DEFAULT 60,
    monto_estimado numeric(12,2),
    presupuesto_id uuid,
    venta_id uuid,
    notas text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  )`,
  `CREATE INDEX IF NOT EXISTS idx_turnos_tenant ON turnos(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_turnos_tenant_inicio ON turnos(tenant_id, inicio)`,
  `CREATE INDEX IF NOT EXISTS idx_turnos_tenant_estado ON turnos(tenant_id, estado)`,
  `CREATE INDEX IF NOT EXISTS idx_turnos_tenant_cliente ON turnos(tenant_id, cliente_id)`,

  `CREATE TABLE IF NOT EXISTS vencimientos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tipo tipo_vencimiento NOT NULL DEFAULT 'otro',
    titulo text NOT NULL,
    proximo_vencimiento date NOT NULL,
    periodicidad periodicidad_vencimiento NOT NULL DEFAULT 'anual',
    dias_aviso_anticipado integer NOT NULL DEFAULT 7,
    monto_estimado numeric(12,2),
    activo boolean NOT NULL DEFAULT true,
    notas text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  )`,
  `CREATE INDEX IF NOT EXISTS idx_venc_tenant ON vencimientos(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_venc_tenant_proximo ON vencimientos(tenant_id, proximo_vencimiento)`,
  `CREATE INDEX IF NOT EXISTS idx_venc_tenant_activo ON vencimientos(tenant_id, activo)`,

  `CREATE TABLE IF NOT EXISTS vencimientos_ocurrencias (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vencimiento_id uuid NOT NULL REFERENCES vencimientos(id) ON DELETE CASCADE,
    vence date NOT NULL,
    estado estado_ocurrencia NOT NULL DEFAULT 'pendiente',
    pagado_at timestamptz,
    monto_pagado numeric(12,2),
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_venc_oc_tenant ON vencimientos_ocurrencias(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_venc_oc_venc ON vencimientos_ocurrencias(vencimiento_id)`,

  // 4) Tablas — Préstamos
  `CREATE TABLE IF NOT EXISTS prestamos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    estado estado_prestamo NOT NULL DEFAULT 'vigente',
    sistema sistema_amortizacion NOT NULL DEFAULT 'frances',
    capital numeric(12,2) NOT NULL,
    tasa_nominal_anual numeric(7,4) NOT NULL,
    frecuencia frecuencia_pago NOT NULL DEFAULT 'mensual',
    cantidad_cuotas integer NOT NULL,
    fecha_otorgamiento date NOT NULL,
    fecha_primer_vencimiento date NOT NULL,
    tasa_punitoria_anual numeric(7,4),
    dias_gracia integer NOT NULL DEFAULT 0,
    notas text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  )`,
  `CREATE INDEX IF NOT EXISTS idx_prestamos_tenant ON prestamos(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_prestamos_tenant_estado ON prestamos(tenant_id, estado)`,
  `CREATE INDEX IF NOT EXISTS idx_prestamos_tenant_cliente ON prestamos(tenant_id, cliente_id)`,

  `CREATE TABLE IF NOT EXISTS cuotas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    prestamo_id uuid NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
    numero integer NOT NULL,
    vencimiento date NOT NULL,
    monto_cuota numeric(12,2) NOT NULL,
    capital numeric(12,2) NOT NULL,
    interes numeric(12,2) NOT NULL,
    saldo_posterior numeric(12,2) NOT NULL,
    estado estado_cuota NOT NULL DEFAULT 'pendiente',
    monto_pagado numeric(12,2) NOT NULL DEFAULT '0',
    mora_acumulada numeric(12,2) NOT NULL DEFAULT '0',
    pagada_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uniq_cuota_prestamo_numero ON cuotas(prestamo_id, numero)`,
  `CREATE INDEX IF NOT EXISTS idx_cuotas_tenant ON cuotas(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_cuotas_tenant_vencimiento ON cuotas(tenant_id, vencimiento)`,
  `CREATE INDEX IF NOT EXISTS idx_cuotas_prestamo ON cuotas(prestamo_id)`,

  `CREATE TABLE IF NOT EXISTS pagos_prestamo (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    prestamo_id uuid NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
    cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
    usuario_id uuid REFERENCES users(id) ON DELETE SET NULL,
    fecha timestamptz NOT NULL DEFAULT now(),
    monto_total numeric(12,2) NOT NULL,
    a_mora numeric(12,2) NOT NULL DEFAULT '0',
    a_interes numeric(12,2) NOT NULL DEFAULT '0',
    a_capital numeric(12,2) NOT NULL DEFAULT '0',
    metodo metodo_pago NOT NULL DEFAULT 'efectivo',
    referencia text,
    anulado_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pagos_prestamo_tenant ON pagos_prestamo(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pagos_prestamo_prestamo ON pagos_prestamo(prestamo_id)`,
];

async function main() {
  console.log('Aplicando migración: agenda + préstamos...\n');
  for (const stmt of statements) {
    const label = stmt.replace(/\s+/g, ' ').slice(0, 70);
    await sql.unsafe(stmt);
    console.log('  ok:', label);
  }
  await sql.end();
  console.log('\n🎉 Migración aplicada correctamente.');
}

main().catch((err) => {
  console.error('Error en migración:', err);
  process.exit(1);
});
