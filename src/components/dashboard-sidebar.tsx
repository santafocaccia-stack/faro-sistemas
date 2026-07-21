'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { GestoIsotipo } from '@/components/brand/gesto-logo';
import {
  Settings, LogOut, Search, Command, UsersRound,
  ShoppingCart, ArrowRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { navParaSession, POS_HREF, type NavItem } from '@/lib/nav';
import { tienePermiso, type Permiso } from '@/lib/permisos';
import { PLANES, planTiene, type PlanId } from '@/lib/planes';
import type { Rol } from '@/server/db/schema';

type Props = {
  email: string;
  plan: PlanId;
  rol: Rol;
  permisos: Permiso[] | null;
  tenantNombre: string;
  onOpenCommand: () => void;
};

export function DashboardSidebar({ email, plan, rol, permisos, tenantNombre, onOpenCommand }: Props) {
  const pathname = usePathname();
  const router   = useRouter();
  const sujeto   = { rol, plan, permisos };
  const navPlan  = navParaSession(sujeto);
  const planInfo = PLANES[plan];
  // "Sistema" (Config/Equipo) se muestra si tiene alguno de esos dos permisos.
  const esGestor = tienePermiso(sujeto, 'gestionar_config') || tienePermiso(sujeto, 'gestionar_equipo');
  const tienePOS = planTiene(plan, 'pos') && tienePermiso(sujeto, 'usar_pos');

  /* Precarga las rutas principales en background al montar el sidebar */
  useEffect(() => {
    const rutas = [
      ...(tienePOS ? [POS_HREF] : []),
      ...navPlan.primary.map((i) => i.href),
      ...navPlan.secondary.filter((i) => !i.pronto).map((i) => i.href),
    ];
    rutas.forEach((href) => router.prefetch(href));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        <Link href="/dashboard" className="flex items-center gap-2.5 group min-w-0 px-1.5 py-1.5 -mx-1.5 rounded-lg hover:bg-foreground/[0.04] transition-colors flex-1">
          <GestoIsotipo color="var(--gesto-brand)" className="h-8 w-8 shrink-0" />

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

      {/* ── Botón VENDER destacado (solo planes con POS) ──── */}
      {tienePOS && (
        <div className="relative px-3 pb-3">
          <Link
            href={POS_HREF}
            prefetch={true}
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
      )}

      {/* ── Navegación primaria ──────────────────────────── */}
      <nav className="relative flex-1 px-3 pb-3 space-y-0.5 overflow-y-auto">
        {navPlan.primary.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href, item.exactMatch)}
          />
        ))}

        {/* ── Items secundarios — listados directos (sin "Más") ── */}
        {navPlan.secondary.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href, item.exactMatch)}
          />
        ))}

        {/* ── Sistema (al fondo del nav) — solo owner/admin ──── */}
        {esGestor && (
        <div className="pt-5 space-y-0.5">
          <p className="px-2.5 pb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/40 select-none">
            Sistema
          </p>
          {(() => {
          const sistemaItems = [
            { href: '/dashboard/config/equipo', label: 'Equipo',         Icon: UsersRound, permiso: 'gestionar_equipo' as Permiso },
            { href: '/dashboard/config',        label: 'Configuración',  Icon: Settings,   permiso: 'gestionar_config' as Permiso },
          ].filter((i) => tienePermiso(sujeto, i.permiso));
          // El item activo es el de href MÁS específico que matchea el pathname.
          // Así /dashboard/config/equipo marca solo "Equipo" (no también "Configuración").
          const activeHref = sistemaItems
            .map((i) => i.href)
            .filter((h) => pathname === h || pathname.startsWith(h + '/'))
            .sort((a, b) => b.length - a.length)[0];
          return sistemaItems.map(({ href, label, Icon }) => {
            const active = href === activeHref;
            return (
              <Link
                key={href}
                href={href}
                prefetch={true}
                className={cn(
                  'relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-all duration-150',
                  active
                    ? 'bg-foreground/[0.06] text-foreground font-medium nav-active-ribbon'
                    : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground',
                )}
              >
                <Icon
                  className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground/80')}
                  strokeWidth={active ? 2 : 1.75}
                />
                {label}
              </Link>
            );
          });
          })()}
        </div>
        )}
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
          <ThemeToggle className="!h-7 !w-7 border-0 bg-transparent" />
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
      prefetch={true}
      className={cn(
        'relative flex items-center gap-2.5 rounded-md transition-all duration-150',
        compact ? 'px-2 py-1 text-[12.5px]' : 'px-2.5 py-1.5 text-[13px]',
        active
          ? 'bg-foreground/[0.06] text-foreground font-medium nav-active-ribbon'
          : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground',
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
