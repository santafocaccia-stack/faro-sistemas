'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { DashboardSidebar } from './dashboard-sidebar';
import { MobileBottomNav } from './mobile-bottom-nav';
import { CommandPalette } from './command-palette';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
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
  const pathname = usePathname();
  const esPos = pathname === '/dashboard/ventas';

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
    <div className="h-[100dvh] flex relative overflow-hidden">
      {/* Sidebar — solo desktop */}
      <DashboardSidebar
        email={email}
        plan={plan}
        tenantNombre={tenantNombre}
        onOpenCommand={() => setOpenCmd(true)}
      />

      {/*
        Contenido principal.
        - En POS mobile: sin padding-bottom (la bottom nav está oculta).
        - En otras páginas: pb-16 para que el contenido no quede detrás del bottom nav.
      */}
      <main
        className={cn(
          'flex-1 relative',
          esPos ? 'overflow-hidden' : 'overflow-y-auto pb-16 md:pb-0',
        )}
      >
        {children}
      </main>

      {/* Bottom navigation — solo mobile, oculto en POS */}
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
