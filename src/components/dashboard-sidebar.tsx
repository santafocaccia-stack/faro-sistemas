'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Settings, LogOut, Search, Command, UsersRound,
  ShoppingCart, ChevronDown, MoreHorizontal, ArrowRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { NAV_POR_PLAN, POS_HREF, type NavItem } from '@/lib/nav';
import { PLANES, type PlanId } from '@/lib/planes';

type Props = {
  email: string;
  plan: PlanId;
  tenantNombre: string;
  onOpenCommand: () => void;
};

export function DashboardSidebar({ email, plan, tenantNombre, onOpenCommand }: Props) {
  const pathname = usePathname();
  const router   = useRouter();
  const navPlan  = NAV_POR_PLAN[plan];
  const planInfo = PLANES[plan];

  /* "Más" dropdown */
  const [masOpen, setMasOpen] = useState(false);
  const masRef = useRef<HTMLDivElement>(null);

  /* Cierra el menú al hacer click afuera */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (masRef.current && !masRef.current.contains(e.target as Node)) setMasOpen(false);
    }
    if (masOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [masOpen]);

  /* Cierra al cambiar de ruta */
  useEffect(() => { setMasOpen(false); }, [pathname]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function isActive(href: string, exactMatch?: boolean) {
    if (exactMatch) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  }

  const posActive = isActive(POS_HREF, true);
  const masActive = navPlan.secondary.some((i) => isActive(i.href));

  return (
    <aside className="hidden md:flex w-60 shrink-0 bg-sidebar border-r border-sidebar-border flex-col relative">

      {/* Glow superior sutil */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top, oklch(0.70 0.22 43 / 0.10), transparent 70%)' }}
      />

      {/* ── Header: Logo + nombre del negocio ─────────────── */}
      <div className="relative h-[3.75rem] flex items-center px-3 border-b border-sidebar-border shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 group min-w-0 px-1.5 py-1.5 -mx-1.5 rounded-lg hover:bg-white/[0.03] transition-colors flex-1">
          <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-[oklch(0.55_0.20_30)] flex items-center justify-center shadow-[0_0_0_1px_oklch(1_0_0_/_0.08)_inset,0_4px_14px_oklch(0.70_0.22_43_/_0.40)] shrink-0">
            <span className="text-primary-foreground font-bold text-sm leading-none tracking-tight">G</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[13px] text-sidebar-foreground tracking-tight leading-tight truncate">
              {tenantNombre}
            </p>
            <p className="text-[10px] text-muted-foreground/60 leading-tight truncate font-medium">
              {planInfo.nombre.replace('Gesto ', '')}
            </p>
          </div>
        </Link>
      </div>

      {/* ── Buscador global compacto ─────────────────────── */}
      <div className="relative px-3 pt-3 pb-2.5">
        <button
          onClick={onOpenCommand}
          className="w-full flex items-center gap-2 px-2.5 h-8 rounded-lg bg-background/40 border border-sidebar-border hover:border-border hover:bg-background/70 transition-colors group"
        >
          <Search className="h-3.5 w-3.5 text-muted-foreground/70 group-hover:text-muted-foreground" />
          <span className="text-[12px] text-muted-foreground/70 flex-1 text-left">Buscar...</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/50 font-mono">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>
      </div>

      {/* ── Botón VENDER destacado ───────────────────────── */}
      <div className="relative px-3 pb-3">
        <Link
          href={POS_HREF}
          className={cn(
            'group relative w-full flex items-center gap-2 px-3 h-11 rounded-xl',
            'bg-primary text-primary-foreground font-bold text-[14px] tracking-tight',
            'transition-all duration-150 press-scale',
            posActive
              ? 'glow-primary brightness-110'
              : 'glow-primary hover:brightness-105',
          )}
        >
          <ShoppingCart className="h-4 w-4" strokeWidth={2.25} />
          <span>Vender</span>
          <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-60 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* ── Navegación primaria ──────────────────────────── */}
      <nav className="relative flex-1 px-3 pb-3 space-y-0.5 overflow-y-auto">
        {navPlan.primary.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href, item.exactMatch)}
          />
        ))}

        {/* ── Más... (collapsible) ─────────────────────── */}
        {navPlan.secondary.length > 0 && (
          <div ref={masRef} className="relative pt-1">
            <button
              onClick={() => setMasOpen((v) => !v)}
              className={cn(
                'relative w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-all duration-150',
                masActive || masOpen
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground',
              )}
            >
              <MoreHorizontal
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  masActive ? 'text-primary' : 'text-muted-foreground/80',
                )}
                strokeWidth={masActive ? 2 : 1.75}
              />
              <span className={cn(masActive && 'font-medium')}>Más</span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 ml-auto text-muted-foreground/60 transition-transform duration-150',
                  masOpen && 'rotate-180',
                )}
              />
            </button>

            {/* Items secundarios — popover/collapsible */}
            {masOpen && (
              <div className="mt-1 ml-2 pl-2.5 border-l border-sidebar-border space-y-0.5 animate-fade-up">
                {navPlan.secondary.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={isActive(item.href, item.exactMatch)}
                    compact
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Sistema (al fondo del nav) ───────────────── */}
        <div className="pt-5 space-y-0.5">
          <p className="px-2.5 pb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/40 select-none">
            Sistema
          </p>
          {[
            { href: '/dashboard/config/equipo', label: 'Equipo',         Icon: UsersRound },
            { href: '/dashboard/config',        label: 'Configuración',  Icon: Settings },
          ].map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-all duration-150',
                  active
                    ? 'bg-white/[0.06] text-foreground font-medium nav-active-ribbon'
                    : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground',
                )}
              >
                <Icon
                  className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground/80')}
                  strokeWidth={active ? 2 : 1.75}
                />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Footer usuario ───────────────────────────────── */}
      <div className="relative border-t border-sidebar-border p-2 shrink-0">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md group">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-semibold text-primary uppercase">{email.charAt(0)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-foreground/80 truncate font-medium leading-tight">
              {email.split('@')[0]}
            </p>
            <p className="text-[10px] text-muted-foreground/60 truncate leading-tight">
              {email.split('@')[1]}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────
   Sub-componente: link de navegación reutilizable
───────────────────────────────────────────────────────────── */
function NavLink({
  item,
  active,
  compact = false,
}: {
  item: NavItem;
  active: boolean;
  compact?: boolean;
}) {
  const Icon = item.icon;

  if (item.pronto) {
    return (
      <div className="relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] text-muted-foreground/30 cursor-default select-none">
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        {item.label}
        <span className="ml-auto text-[9px] font-medium text-muted-foreground/40 bg-muted/40 px-1.5 py-0.5 rounded-full">
          pronto
        </span>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        'relative flex items-center gap-2.5 rounded-md transition-all duration-150',
        compact ? 'px-2 py-1 text-[12.5px]' : 'px-2.5 py-1.5 text-[13px]',
        active
          ? 'bg-white/[0.06] text-foreground font-medium nav-active-ribbon'
          : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground',
      )}
    >
      <Icon
        className={cn(
          'shrink-0 transition-colors',
          compact ? 'h-3.5 w-3.5' : 'h-4 w-4',
          active ? 'text-primary' : 'text-muted-foreground/80',
        )}
        strokeWidth={active ? 2 : 1.75}
      />
      {item.label}
    </Link>
  );
}
