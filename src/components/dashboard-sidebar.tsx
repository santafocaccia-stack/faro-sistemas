'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Package, Users, ShoppingCart, BookOpen, BarChart3, Settings, LayoutDashboard, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const items = [
  { href: '/dashboard',                     label: 'Inicio',            icon: LayoutDashboard },
  { href: '/dashboard/productos',           label: 'Productos',         icon: Package },
  { href: '/dashboard/clientes',            label: 'Clientes',          icon: Users },
  { href: '/dashboard/ventas/minorista',    label: 'Venta Minorista',   icon: ShoppingCart },
  { href: '/dashboard/ventas/mayorista',    label: 'Venta Mayorista',   icon: ShoppingCart },
  { href: '/dashboard/cc',                  label: 'Cuenta Corriente',  icon: BookOpen },
  { href: '/dashboard/reportes',            label: 'Reportes',          icon: BarChart3 },
  { href: '/dashboard/config',              label: 'Configuración',     icon: Settings },
];

export function DashboardSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="w-60 shrink-0 border-r bg-background flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
            F
          </div>
          <span className="font-semibold">Faro Sistemas</span>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t">
        <div className="text-xs text-muted-foreground truncate mb-2 px-2">{email}</div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
