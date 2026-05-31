/**
 * Migración manual: agrega codigo_plu a productos y es_plantilla a presupuestos.
 * Ejecutar: npx tsx scripts/migrate-add-plu-plantillas.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL no definida en .env.local');

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 1 });

async function main() {
  console.log('Aplicando migración: código PLU + plantillas de presupuesto...');

  await sql`
    ALTER TABLE productos
      ADD COLUMN IF NOT EXISTS codigo_plu text
  `;
  console.log('✅ productos.codigo_plu agregado');

  await sql`
    ALTER TABLE presupuestos
      ADD COLUMN IF NOT EXISTS es_plantilla boolean NOT NULL DEFAULT false
  `;
  console.log('✅ presupuestos.es_plantilla agregado');

  await sql`
    ALTER TABLE presupuestos
      ADD COLUMN IF NOT EXISTS nombre_plantilla text
  `;
  console.log('✅ presupuestos.nombre_plantilla agregado');

  await sql.end();
  console.log('\n🎉 Migración aplicada correctamente.');
}

main().catch((err) => {
  console.error('Error en migración:', err);
  process.exit(1);
});
