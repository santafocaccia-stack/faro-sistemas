'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Settings, LogOut, Search, Command, UsersRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { NAV_POR_PLAN } from '@/lib/nav';
import { PLANES } from '@/lib/planes';
import type { PlanId } from '@/lib/planes';

type Props = {
  email: string;
  plan: PlanId;
  onOpenCommand: () => void;
};

export function DashboardSidebar({ email, plan, onOpenCommand }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const sections = NAV_POR_PLAN[plan];
  const planInfo = PLANES[plan];

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

  return (
    <aside className="hidden md:flex w-60 shrink-0 bg-sidebar border-r border-sidebar-border flex-col relative">

      {/* Gradiente radial sutil */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top, oklch(0.68 0.19 38 / 0.10), transparent 70%)' }}
      />

      {/* Logo + plan badge */}
      <div className="relative h-14 flex items-center px-4 border-b border-sidebar-border shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 group min-w-0">
          <div className="relative h-7 w-7 rounded-[7px] bg-gradient-to-br from-primary to-[oklch(0.55_0.18_28)] flex items-center justify-center shadow-[0_0_0_1px_oklch(1_0_0_/_0.08)_inset,0_4px_12px_oklch(0.68_0.19_38_/_0.35)] shrink-0">
            <span className="text-primary-foreground font-bold text-[13px] leading-none tracking-tight">G</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[13px] text-sidebar-foreground tracking-tight leading-tight">Gesto</p>
            <p className="text-[10px] text-muted-foreground/60 leading-tight truncate">{planInfo.nombre.replace('Gesto ', '')}</p>
          </div>
        </Link>
      </div>

      {/* Botón ⌘K */}
      <div className="relative px-3 pt-3 pb-2">
        <button
          onClick={onOpenCommand}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-background/50 border border-sidebar-border hover:border-border hover:bg-background/80 transition-colors"
        >
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground flex-1 text-left">Buscar...</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/70 font-mono">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 px-3 pb-3 space-y-0.5 overflow-y-auto">
        {sections.map((section, si) => (
          <div key={si} className={si > 0 ? 'pt-4' : ''}>
            {section.title && (
              <p className="px-2.5 pb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/50 select-none">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exactMatch);
              if (item.pronto) {
                return (
                  <div
                    key={item.href}
                    className="relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] text-muted-foreground/30 cursor-default select-none"
                  >
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
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-all duration-150',
                    active
                      ? 'bg-white/[0.06] text-foreground font-medium nav-active-ribbon'
                      : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground'
                  )}
                >
                  <Icon
                    className={cn('h-4 w-4 shrink-0 transition-colors', active ? 'text-primary' : 'text-muted-foreground/80')}
                    strokeWidth={active ? 2 : 1.75}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Config al fondo */}
        <div className="pt-4 space-y-0.5">
          {[
            { href: '/dashboard/config/equipo', label: 'Equipo',        Icon: UsersRound },
            { href: '/dashboard/config',        label: 'Configuración', Icon: Settings },
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
                    : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground'
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

      {/* Footer usuario */}
      <div className="relative border-t border-sidebar-border p-2 shrink-0">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md group">
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-semibold text-primary uppercase">{email.charAt(0)}</span>
          </div>
          <p className="text-[11px] text-muted-foreground truncate flex-1">{email}</p>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded hover:bg-white/5"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
