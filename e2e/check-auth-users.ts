import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
async function main() {
  const users = await sql<{ id: string; email: string }[]>`
    SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 10
  `;
  console.log('Usuarios en auth.users:');
  users.forEach(u => console.log(`  ${u.email} → ${u.id}`));
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
