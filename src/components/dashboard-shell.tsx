'use client';

import { useEffect, useState } from 'react';
import { DashboardSidebar } from './dashboard-sidebar';
import { MobileBottomNav } from './mobile-bottom-nav';
import { CommandPalette } from './command-palette';
import { Toaster } from '@/components/ui/sonner';
import type { Producto, Cliente } from '@/server/db/schema';
import type { PlanId } from '@/lib/planes';

type Props = {
  email: string;
  plan: PlanId;
  tenantNombre: string;
  productos: Producto[];
  clientes: Cliente[];
  children: React.ReactNode;
};

export function DashboardShell({ email, plan, tenantNombre, productos, clientes, children }: Props) {
  const [openCmd, setOpenCmd] = useState(false);

  // Atajo ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpenCmd((v) => !v);
      }
      if (e.key === 'Escape') setOpenCmd(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="min-h-screen flex relative">
      {/* Sidebar — solo desktop */}
      <DashboardSidebar
        email={email}
        plan={plan}
        tenantNombre={tenantNombre}
        onOpenCommand={() => setOpenCmd(true)}
      />

      {/* Contenido principal — padding bottom en mobile para no quedar detrás del bottom nav */}
      <main className="flex-1 overflow-y-auto relative pb-16 md:pb-0">
        {children}
      </main>

      {/* Bottom navigation — solo mobile */}
      <MobileBottomNav email={email} />

      <CommandPalette
        open={openCmd}
        onOpenChange={setOpenCmd}
        productos={productos}
        clientes={clientes}
      />
      <Toaster />
    </div>
  );
}
