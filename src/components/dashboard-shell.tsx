'use client';

import { useEffect, useState } from 'react';
import { DashboardSidebar } from './dashboard-sidebar';
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
      <DashboardSidebar email={email} onOpenCommand={() => setOpenCmd(true)} />
      <main className="flex-1 overflow-y-auto relative">
        {children}
      </main>
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
