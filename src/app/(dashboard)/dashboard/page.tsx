import { requireSession } from '@/server/auth/session';

export default async function DashboardPage() {
  const session = await requireSession();
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Bienvenido</h1>
      <p className="text-muted-foreground mt-1">{session.email}</p>
    </main>
  );
}
