/**
 * Cliente Drizzle conectado a Postgres.
 * Singleton — una sola conexión pool para toda la app.
 *
 * Dos niveles de acceso:
 *
 * - `withTenant(tenantId, fn)` — camino NORMAL de la app. Corre `fn` dentro de
 *   una transacción con `app.tenant_id` seteado (SET LOCAL), de modo que las
 *   policies de RLS aplican. El código igual filtra con `byTenant()` — RLS es
 *   la red de seguridad, no la única defensa.
 *
 * - `dbAdmin` — acceso cross-tenant EXPLÍCITO. Solo para: lookup de sesión
 *   (antes de conocer el tenant), webhooks (MP), crons, panel super-admin y
 *   alta de tenants. Cualquier uso nuevo de dbAdmin necesita justificación.
 *
 * `db` (export legado) sigue existiendo mientras dura la migración de call
 * sites a withTenant/dbAdmin. Cuando la conexión pase al rol `gesto_app`
 * (NOBYPASSRLS), las queries por `db` fuera de withTenant devuelven 0 filas
 * (fail-closed) — no filtran datos.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL no está definida');
}

// Conexión admin (rol con BYPASSRLS) para los caminos cross-tenant legítimos.
// Hasta el cutover de rol, es la misma URL que la app.
const adminConnectionString = process.env.DATABASE_URL_ADMIN ?? connectionString;

// En desarrollo Next.js HMR puede crear múltiples instancias. Reusamos.
declare global {
  var __pgClient: ReturnType<typeof postgres> | undefined;
  var __pgClientAdmin: ReturnType<typeof postgres> | undefined;
}

// prepare: false requerido por Supabase Transaction pooler (puerto 6543)
const client = global.__pgClient ?? postgres(connectionString, { prepare: false, max: 10 });
if (process.env.NODE_ENV !== 'production') global.__pgClient = client;

const clientAdmin =
  adminConnectionString === connectionString
    ? client
    : (global.__pgClientAdmin ?? postgres(adminConnectionString, { prepare: false, max: 4 }));
if (process.env.NODE_ENV !== 'production') global.__pgClientAdmin = clientAdmin;

export const db = drizzle(client, { schema });

/** Acceso cross-tenant explícito. Ver doc del módulo antes de usar. */
export const dbAdmin = drizzle(clientAdmin, { schema });

export { schema };
export type Db = typeof db;

/** Transacción tipada de drizzle sobre nuestro schema (lo que recibe withTenant). */
export type Tx = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

/**
 * Ejecuta `fn` dentro de una transacción con el tenant seteado para RLS.
 *
 *   const session = await requireSession();
 *   return withTenant(session.tenantId, async (db) => {
 *     return db.select().from(productos).where(byTenant(session.tenantId, productos));
 *   });
 *
 * - `set_config(..., true)` = SET LOCAL: vive solo dentro de la transacción,
 *   compatible con el transaction pooler de Supabase (6543).
 * - Nombrar el parámetro `db` en el callback es intencional: shadowea el
 *   import y el cuerpo existente queda igual.
 * - No hacer llamadas HTTP largas (MP, Resend) dentro del callback: retienen
 *   la conexión del pool. Sacarlas afuera y hacer 2 withTenant si hace falta.
 */
export async function withTenant<T>(tenantId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
    return fn(tx);
  });
}
