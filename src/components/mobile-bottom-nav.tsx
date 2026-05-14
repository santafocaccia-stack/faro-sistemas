'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, ShoppingCart, Users, MoreHorizontal,
  History, Package, BookOpen, FileText, BarChart3,
  UsersRound, Settings, LogOut, X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/* ── Íconos fijos en la barra ─────────────────────────── */
const BOTTOM_TABS = [
  { href: '/dashboard',          label: 'Inicio',    icon: LayoutDashboard, exactMatch: true  },
  { href: '/dashboard/ventas',   label: 'POS',       icon: ShoppingCart,    exactMatch: true  },
  { href: '/dashboard/clientes', label: 'Clientes',  icon: Users,           exactMatch: false },
];

/* ── Ítems del drawer "Más" ───────────────────────────── */
const MAS_ITEMS = [
  { href: '/dashboard/ventas/historial', label: 'Historial',      icon: History },
  { href: '/dashboard/productos',        label: 'Productos',       icon: Package },
  { href: '/dashboard/cc',               label: 'Cta. Corriente',  icon: BookOpen },
  { href: '/dashboard/presupuestos',     label: 'Presupuestos',    icon: FileText },
  { href: '/dashboard/reportes',         label: 'Reportes',        icon: BarChart3 },
  { href: '/dashboard/config/equipo',    label: 'Equipo',          icon: UsersRound },
  { href: '/dashboard/config',           label: 'Configuración',   icon: Settings },
];

function isActive(href: string, pathname: string, exactMatch?: boolean) {
  if (exactMatch) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

export function MobileBottomNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [masOpen, setMasOpen] = useState(false);

  /* Cerrar drawer al cambiar de ruta */
  useEffect(() => { setMasOpen(false); }, [pathname]);

  /* Bloquear scroll del body cuando el drawer está abierto */
  useEffect(() => {
    document.body.style.overflow = masOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [masOpen]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  /* ¿Algún ítem del drawer está activo? → iluminar botón Más */
  const masActive = MAS_ITEMS.some((i) => isActive(i.href, pathname)) ||
    pathname.startsWith('/dashboard/config');

  return (
    <>
      {/* ── Barra fija inferior ─────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar border-t border-sidebar-border safe-area-pb">
        <div className="flex items-stretch h-16">

          {/* Tabs fijos */}
          {BOTTOM_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.href, pathname, tab.exactMatch);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <Icon
                  className={cn(
                    'h-5 w-5 transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground',
                  )}
                  strokeWidth={active ? 2.25 : 1.75}
                />
                <span className={cn(
                  'text-[10px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}>
                  {tab.label}
                </span>
              </Link>
            );
          })}

          {/* Botón Más */}
          <button
            onClick={() => setMasOpen((v) => !v)}
            className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors"
          >
            <MoreHorizontal
              className={cn(
                'h-5 w-5 transition-colors',
                (masActive || masOpen) ? 'text-primary' : 'text-muted-foreground',
              )}
              strokeWidth={(masActive || masOpen) ? 2.25 : 1.75}
            />
            <span className={cn(
              'text-[10px] font-medium transition-colors',
              (masActive || masOpen) ? 'text-primary' : 'text-muted-foreground',
            )}>
              Más
            </span>
          </button>
        </div>
      </nav>

      {/* ── Backdrop ────────────────────────────────────── */}
      <div
        className={cn(
          'md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          masOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setMasOpen(false)}
      />

      {/* ── Bottom sheet "Más" ──────────────────────────── */}
      <div
        className={cn(
          'md:hidden fixed inset-x-0 bottom-0 z-50 bg-sidebar rounded-t-2xl border-t border-sidebar-border',
          'transition-transform duration-300 ease-out safe-area-pb',
          masOpen ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-semibold text-primary uppercase">
                {email.charAt(0)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate max-w-[200px]">{email}</p>
          </div>
          <button
            onClick={() => setMasOpen(false)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items */}
        <div className="px-4 py-3 grid grid-cols-2 gap-1">
          {MAS_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] font-medium transition-all',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
                )}
              >
                <Icon
                  className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground/80')}
                  strokeWidth={active ? 2.25 : 1.75}
                />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Logout */}
        <div className="px-4 pb-4 pt-1 border-t border-sidebar-border mt-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  );
}
