'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Menu, X, Settings, LogOut, UsersRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { NAV_POR_PLAN } from '@/lib/nav';
import { PLANES } from '@/lib/planes';
import type { PlanId } from '@/lib/planes';

type Props = { email: string; plan: PlanId };

function isActive(href: string, pathname: string, exactMatch?: boolean) {
  if (exactMatch) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

export function MobileNav({ email, plan }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const sections = NAV_POR_PLAN[plan];
  const planInfo = PLANES[plan];

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const configItems = [
    { href: '/dashboard/config/equipo', label: 'Equipo',        Icon: UsersRound },
    { href: '/dashboard/config',        label: 'Configuración', Icon: Settings },
  ];

  return (
    <>
      {/* Header mobile */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 bg-sidebar border-b border-sidebar-border">
        <button
          onClick={() => setOpen(true)}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/dashboard" className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          <div className="h-7 w-7 rounded-[7px] bg-gradient-to-br from-primary to-[oklch(0.55_0.18_28)] flex items-center justify-center shadow-[0_0_0_1px_oklch(1_0_0_/_0.08)_inset,0_4px_12px_oklch(0.68_0.19_38_/_0.35)]">
            <span className="text-primary-foreground font-bold text-[13px] leading-none tracking-tight">G</span>
          </div>
          <p className="font-semibold text-[13px] text-sidebar-foreground tracking-tight">Gesto</p>
        </Link>

        <div className="h-9 w-9" />
      </header>

      {/* Backdrop */}
      <div
        className={cn(
          'md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <div
        className={cn(
          'md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border',
          'flex flex-col transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Drawer header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-[7px] bg-gradient-to-br from-primary to-[oklch(0.55_0.18_28)] flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-[13px] leading-none">G</span>
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-[13px] tracking-tight">Gesto</p>
              <p className="text-[10px] text-muted-foreground/60 -mt-0.5">{planInfo.nombre.replace('Gesto ', '')}</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {sections.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'pt-4' : ''}>
              {group.title && (
                <p className="px-2.5 pb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/50 select-none">
                  {group.title}
                </p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, pathname, item.exactMatch);
                if (item.pronto) {
                  return (
                    <div
                      key={item.href}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] text-muted-foreground/30 cursor-default select-none"
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
                      'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-all',
                      active
                        ? 'bg-white/[0.06] text-foreground font-medium'
                        : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground',
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                    )}
                    <Icon
                      className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground/80')}
                      strokeWidth={active ? 2.25 : 1.75}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}

          {/* Config */}
          <div className="pt-4">
            <p className="px-2.5 pb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/50 select-none">
              Sistema
            </p>
            {configItems.map(({ href, label, Icon }) => {
              const active = isActive(href, pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-all',
                    active
                      ? 'bg-white/[0.06] text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground',
                  )}
                >
                  {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />}
                  <Icon
                    className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground/80')}
                    strokeWidth={active ? 2.25 : 1.75}
                  />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3 shrink-0 space-y-1">
          <div className="flex items-center gap-2 px-3 py-1">
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-semibold text-primary uppercase">{email.charAt(0)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  );
}
