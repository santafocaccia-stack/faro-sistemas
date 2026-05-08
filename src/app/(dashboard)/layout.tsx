import { requireSession } from '@/server/auth/session';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { Toaster } from '@/components/ui/sonner';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <div className="min-h-screen flex">
      <DashboardSidebar email={session.email} />
      <main className="flex-1 overflow-y-auto bg-muted/20">{children}</main>
      <Toaster />
    </div>
  );
}
