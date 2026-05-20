'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { DashboardSidebar } from './dashboard-sidebar';
import { MobileBottomNav } from './mobile-bottom-nav';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import type { PlanId } from '@/lib/planes';

// CommandPalette se carga de forma lazy: el bundle principal no la incluye.
// Los datos (productos/clientes) se cargan en el propio componente solo cuando se abre.
const CommandPalette = dynamic(
  () => import('./command-palette').then((m) => ({ default: m.CommandPalette })),
  { ssr: false },
);

type Props = {
  email: string;
  plan: PlanId;
  tenantNombre: string;
  children: React.ReactNode;
};

export function DashboardShell({ email, plan, tenantNombre, children }: Props) {
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
    <div className="flex-1 min-h-0 flex relative overflow-hidden">
      {/* Sidebar — solo desktop */}
      <DashboardSidebar
        email={email}
        plan={plan}
        tenantNombre={tenantNombre}
        onOpenCommand={() => setOpenCmd(true)}
      />

      {/*
        Contenido principal.
        - En POS mobile: overflow-hidden + pb-16 (reservar lugar para bottom nav)
        - En otras páginas: scroll vertical + pb-16 para no quedar tapado por la nav
      */}
      <main
        className={cn(
          'flex-1 relative min-h-0 pb-16 md:pb-0',
          esPos ? 'overflow-hidden' : 'overflow-y-auto',
        )}
      >
        {children}
      </main>

      {/* Bottom navigation — solo mobile, oculto en POS */}
      <MobileBottomNav email={email} />

      {/* Solo se monta (y carga su chunk JS) cuando el usuario abre ⌘K */}
      {openCmd && (
        <CommandPalette
          open={openCmd}
          onOpenChange={setOpenCmd}
        />
      )}
      <Toaster />
    </div>
  );
}
