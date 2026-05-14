'use client';

import { useEffect, useState } from 'react';
import { DashboardSidebar } from './dashboard-sidebar';
import { MobileNav } from './mobile-nav';
import { CommandPalette } from './command-palette';
import { Toaster } from '@/components/ui/sonner';
import type { Producto, Cliente } from '@/server/db/schema';

type Props = {
  email: string;
  productos: Producto[];
  clientes: Cliente[];
  children: React.ReactNode;
};

export function DashboardShell({ email, productos, clientes, children }: Props) {
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
      <DashboardSidebar email={email} onOpenCommand={() => setOpenCmd(true)} />

      {/* Contenido principal — padding top en mobile para no quedar detrás del header */}
      <main className="flex-1 overflow-y-auto relative pt-14 md:pt-0">
        {children}
      </main>

      {/* Header + drawer — solo mobile */}
      <MobileNav email={email} />

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
