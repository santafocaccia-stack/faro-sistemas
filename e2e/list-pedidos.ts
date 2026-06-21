import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
async function main() {
  const rows = await sql`SELECT id, nombre_contacto, direccion, localidad, fecha_programada, estado, created_at FROM pedidos_atmosfericos ORDER BY created_at DESC`;
  console.log(JSON.stringify(rows, null, 2));
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
