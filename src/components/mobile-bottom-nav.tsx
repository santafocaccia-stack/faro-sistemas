'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  ShoppingCart, MoreHorizontal, UsersRound, Settings, LogOut, X,
  type LucideIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { navParaSession, POS_HREF } from '@/lib/nav';
import { tienePermiso, type Permiso } from '@/lib/permisos';
import { planTiene, type PlanId } from '@/lib/planes';
import { usePosCart, selectCantidadItems } from '@/lib/stores/pos-cart';
import type { Rol } from '@/server/db/schema';

type Tab = { href: string; label: string; icon: LucideIcon; exactMatch?: boolean };

function isActive(href: string, pathname: string, exactMatch?: boolean) {
  if (exactMatch) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

export function MobileBottomNav({ email, plan, rol, permisos }: { email: string; plan: PlanId; rol: Rol; permisos: Permiso[] | null }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [masOpen, setMasOpen] = useState(false);
  const cantidadItems = usePosCart(selectCantidadItems);

  const sujeto   = { rol, plan, permisos };
  const navPlan  = navParaSession(sujeto);
  const tienePOS = planTiene(plan, 'pos') && tienePermiso(sujeto, 'usar_pos');

  /* Ítems del plan (sin los marcados "pronto") */
  const primary   = navPlan.primary.filter((i) => !i.pronto) as Tab[];
  const secondary = navPlan.secondary.filter((i) => !i.pronto) as Tab[];

  /* Config — gateado por permiso, al final del drawer "Más" */
  const configItems: Tab[] = [
    { href: '/dashboard/config/equipo', label: 'Equipo',        icon: UsersRound, permiso: 'gestionar_equipo' as Permiso },
    { href: '/dashboard/config',        label: 'Configuración', icon: Settings,   permiso: 'gestionar_config' as Permiso },
  ].filter((i) => tienePermiso(sujeto, i.permiso)).map(({ href, label, icon }) => ({ href, label, icon }));

  /* Distribución de la barra:
     - Con POS: 2 tabs a la izquierda + FAB Vender al centro + 1 a la derecha. El resto va a "Más".
     - Sin POS: hasta 4 tabs planos + "Más". */
  const leftTabs  = tienePOS ? primary.slice(0, 2) : primary.slice(0, 4);
  const rightTabs = tienePOS ? primary.slice(2, 3) : [];
  const overflow  = tienePOS ? primary.slice(3) : primary.slice(4);

  const masItems = [...overflow, ...secondary, ...configItems];
  const showMas  = masItems.length > 0;

  useEffect(() => { setMasOpen(false); }, [pathname]);
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

  const masActive   = masItems.some((i) => isActive(i.href, pathname)) || pathname.startsWith('/dashboard/config');
  const venderActive = isActive(POS_HREF, pathname, true);

  const renderTab = (tab: Tab) => {
    const Icon = tab.icon;
    const active = isActive(tab.href, pathname, tab.exactMatch);
    return (
      <Link
        key={tab.href}
        href={tab.href}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors min-w-0"
      >
        <Icon
          className={cn('h-5 w-5 transition-colors', active ? 'text-primary' : 'text-muted-foreground')}
          strokeWidth={active ? 2.25 : 1.75}
        />
        <span className={cn(
          'text-[10px] font-medium transition-colors truncate max-w-full px-0.5',
          active ? 'text-primary' : 'text-muted-foreground',
        )}>
          {tab.label}
        </span>
      </Link>
    );
  };

  return (
    <>
      {/* ── Barra fija inferior ─────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar border-t border-sidebar-border safe-area-pb">
        <div className="relative flex items-stretch h-16">

          {/* Tabs izquierda */}
          {leftTabs.map(renderTab)}

          {/* FAB Vender — solo planes con POS */}
          {tienePOS && (venderActive ? (
            <Link
              href={POS_HREF}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
              aria-label="Vender (página actual)"
            >
              <ShoppingCart className="h-5 w-5 text-primary" strokeWidth={2.25} />
              <span className="text-[10px] font-semibold text-primary">Vender</span>
            </Link>
          ) : (
            <div className="flex-1 relative flex items-start justify-center">
              <Link
                href={POS_HREF}
                className={cn(
                  'glow-primary absolute -top-5 h-14 w-14 rounded-2xl flex items-center justify-center',
                  'bg-primary text-primary-foreground',
                  'transition-all duration-150 active:scale-95',
                )}
                aria-label="Nueva venta"
              >
                <ShoppingCart className="h-6 w-6" strokeWidth={2.25} />
                {cantidadItems > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white leading-none shadow-sm">
                    {cantidadItems > 99 ? '99+' : cantidadItems}
                  </span>
                )}
              </Link>
              <span className="absolute bottom-2 text-[10px] font-semibold text-muted-foreground">
                Vender
              </span>
            </div>
          ))}

          {/* Tabs derecha */}
          {rightTabs.map(renderTab)}

          {/* Botón Más */}
          {showMas && (
            <button
              onClick={() => setMasOpen((v) => !v)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
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
          )}
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
          {masItems.map((item) => {
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
