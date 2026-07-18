'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { DashboardSidebar } from './dashboard-sidebar';
import { MobileBottomNav } from './mobile-bottom-nav';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import type { PlanId } from '@/lib/planes';
import type { Rol } from '@/server/db/schema';
import type { Permiso } from '@/lib/permisos';

// CommandPalette se carga de forma lazy: el bundle principal no la incluye.
// Los datos (productos/clientes) se cargan en el propio componente solo cuando se abre.
const CommandPalette = dynamic(
  () => import('./command-palette').then((m) => ({ default: m.CommandPalette })),
  { ssr: false },
);

type Props = {
  email: string;
  plan: PlanId;
  rol: Rol;
  permisos: Permiso[] | null;
  tenantNombre: string;
  children: React.ReactNode;
};

/**
 * Botón flotante de soporte. El número vive en NEXT_PUBLIC_WHATSAPP_SOPORTE
 * (solo dígitos, con código de país, ej: 5491122334455); sin la variable no
 * se renderiza nada. En el POS se oculta para no tapar el carrito.
 */
function SoporteWhatsApp({ tenantNombre, esPos }: { tenantNombre: string; esPos: boolean }) {
  const numero = process.env.NEXT_PUBLIC_WHATSAPP_SOPORTE;
  if (!numero || esPos) return null;
  const texto = encodeURIComponent(`¡Hola! Necesito ayuda con Gesto (negocio: ${tenantNombre}).`);
  return (
    <a
      href={`https://wa.me/${numero}?text=${texto}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Soporte por WhatsApp"
      className="fixed bottom-20 md:bottom-5 right-4 z-40 h-11 w-11 rounded-full bg-success text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.2 1.3-2 1.4-.5.1-1.2.2-3.6-.8-3-1.2-4.9-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3.1 0-1.5.8-2.2 1-2.5.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5s.8 1.9.8 2c.1.1.1.3 0 .5-.1.2-.2.3-.3.5l-.5.6c-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1.1 2.2 1.4 2.5 1.5.3.1.5.1.7-.1.2-.2.8-.9 1-1.2.2-.3.4-.3.7-.2l2 1c.3.1.5.2.6.3.1.2.1.7-.2 1.7Z" />
      </svg>
    </a>
  );
}

export function DashboardShell({ email, plan, rol, permisos, tenantNombre, children }: Props) {
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
        rol={rol}
        permisos={permisos}
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

      {/* Bottom navigation — solo mobile */}
      <MobileBottomNav email={email} plan={plan} rol={rol} permisos={permisos} />

      {/* Soporte por WhatsApp — visible solo si hay número configurado */}
      <SoporteWhatsApp tenantNombre={tenantNombre} esPos={esPos} />

      {/* Solo se monta (y carga su chunk JS) cuando el usuario abre ⌘K */}
      {openCmd && (
        <CommandPalette
          open={openCmd}
          onOpenChange={setOpenCmd}
          plan={plan}
        />
      )}
      <Toaster />
    </div>
  );
}
