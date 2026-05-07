/**
 * Cliente Drizzle conectado a Postgres.
 * Singleton — una sola conexión pool para toda la app.
 *
 * IMPORTANTE: este cliente NO sabe sobre tenants. Las queries de aplicación
 * deben filtrar por tenant_id explícitamente. Postgres RLS es la red de
 * seguridad pero no reemplaza filtrar a nivel código.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL no está definida');
}

// En desarrollo Next.js HMR puede crear múltiples instancias. Reusamos.
declare global {
  // eslint-disable-next-line no-var
  var __pgClient: ReturnType<typeof postgres> | undefined;
}

const client = global.__pgClient ?? postgres(connectionString, { max: 10 });
if (process.env.NODE_ENV !== 'production') global.__pgClient = client;

export const db = drizzle(client, { schema });
export { schema };
export type Db = typeof db;
