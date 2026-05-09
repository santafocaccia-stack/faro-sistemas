'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Package, Users, ShoppingCart, BookOpen, BarChart3,
  Settings, LayoutDashboard, LogOut, History, Search, Command, UsersRound,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exactMatch?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    title: '',
    items: [
      { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard, exactMatch: true },
    ],
  },
  {
    title: 'Ventas',
    items: [
      { href: '/dashboard/ventas',           label: 'Punto de venta', icon: ShoppingCart, exactMatch: true },
      { href: '/dashboard/ventas/historial', label: 'Historial',      icon: History },
    ],
  },
  {
    title: 'Administración',
    items: [
      { href: '/dashboard/productos', label: 'Productos',      icon: Package },
      { href: '/dashboard/clientes',  label: 'Clientes',       icon: Users },
      { href: '/dashboard/cc',        label: 'Cta. corriente', icon: BookOpen },
    ],
  },
  {
    title: 'Análisis',
    items: [
      { href: '/dashboard/reportes', label: 'Reportes', icon: BarChart3 },
    ],
  },
];

type Props = {
  email: string;
  onOpenCommand: () => void;
};

export function DashboardSidebar({ email, onOpenCommand }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function isActive(item: NavItem) {
    if (item.exactMatch) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  }

  return (
    <aside className="w-60 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col relative">

      {/* Gradiente radial sutil detrás del logo */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at top, oklch(0.68 0.19 38 / 0.10), transparent 70%)',
        }}
      />

      {/* Logo */}
      <div className="relative h-14 flex items-center px-4 border-b border-sidebar-border shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="relative h-7 w-7 rounded-[7px] bg-gradient-to-br from-primary to-[oklch(0.55_0.18_28)] flex items-center justify-center shadow-[0_0_0_1px_oklch(1_0_0_/_0.08)_inset,0_4px_12px_oklch(0.68_0.19_38_/_0.35)]">
            <span className="text-primary-foreground font-bold text-[13px] leading-none tracking-tight">F</span>
          </div>
          <div className="leading-tight">
            <p className="font-semibold text-[13px] text-sidebar-foreground tracking-tight">Faro</p>
            <p className="text-[10px] text-muted-foreground -mt-0.5">Sistemas</p>
          </div>
        </Link>
      </div>

      {/* Botón de búsqueda ⌘K */}
      <div className="relative px-3 pt-3 pb-2">
        <button
          onClick={onOpenCommand}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-background/50 border border-sidebar-border hover:border-border hover:bg-background/80 transition-colors group"
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
              const active = isActive(item);
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
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      active ? 'text-primary' : 'text-muted-foreground/80'
                    )}
                    strokeWidth={active ? 2 : 1.75}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Configuración al fondo */}
        <div className="pt-4 space-y-0.5">
          <Link
            href="/dashboard/config/equipo"
            className={cn(
              'relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-all duration-150',
              pathname.startsWith('/dashboard/config/equipo')
                ? 'bg-white/[0.06] text-foreground font-medium nav-active-ribbon'
                : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground'
            )}
          >
            <UsersRound
              className={cn(
                'h-4 w-4 shrink-0',
                pathname.startsWith('/dashboard/config/equipo') ? 'text-primary' : 'text-muted-foreground/80'
              )}
              strokeWidth={pathname.startsWith('/dashboard/config/equipo') ? 2 : 1.75}
            />
            Equipo
          </Link>
          <Link
            href="/dashboard/config"
            className={cn(
              'relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-all duration-150',
              pathname.startsWith('/dashboard/config')
                ? 'bg-white/[0.06] text-foreground font-medium nav-active-ribbon'
                : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground'
            )}
          >
            <Settings
              className={cn(
                'h-4 w-4 shrink-0',
                pathname.startsWith('/dashboard/config') ? 'text-primary' : 'text-muted-foreground/80'
              )}
              strokeWidth={pathname.startsWith('/dashboard/config') ? 2 : 1.75}
            />
            Configuración
          </Link>
        </div>

      </nav>

      {/* Footer: usuario */}
      <div className="relative border-t border-sidebar-border p-2 shrink-0">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md group">
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-semibold text-primary uppercase">
              {email.charAt(0)}
            </span>
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
