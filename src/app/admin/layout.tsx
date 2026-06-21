import type { ReactNode } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { requireSuperAdmin } from '@/server/auth/super-admin';
import { Toaster } from '@/components/ui/sonner';

/**
 * Layout del panel de plataforma (super-admin). Protege TODO /admin con
 * requireSuperAdmin(). Es cross-tenant: no usa el shell del dashboard.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireSuperAdmin();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link href="/admin/suscripciones" className="flex items-center gap-2 min-w-0">
            <span className="icon-chip size-8 shrink-0">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.9} />
            </span>
            <span className="font-semibold tracking-tight truncate">Gesto · Admin</span>
          </Link>
          <span className="text-xs text-muted-foreground truncate">{admin.email}</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">{children}</main>
      <Toaster />
    </div>
  );
}
