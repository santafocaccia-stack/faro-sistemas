import { requireSession } from '@/server/auth/session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return (
    <div className="min-h-screen flex flex-col">
      {children}
    </div>
  );
}
