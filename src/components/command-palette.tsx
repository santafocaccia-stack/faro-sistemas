'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  Package, BookOpen, FileText, Landmark,
  Settings, Plus, Search, ArrowRight, Loader2,
} from 'lucide-react';
import { listarProductos } from '@/server/actions/productos';
import { listarClientes } from '@/server/actions/clientes';
import type { Producto, Cliente } from '@/server/db/schema';
import { formatARS } from '@/lib/utils';
import { planTiene, type PlanId } from '@/lib/planes';
import { NAV_POR_PLAN } from '@/lib/nav';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanId;
};

export function CommandPalette({ open, onOpenChange, plan }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(false);

  // Qué capacidades aplican al plan (fuente de verdad: CAPACIDADES_POR_PLAN).
  const tieneProductos = planTiene(plan, 'productos');
  const tieneClientes = planTiene(plan, 'clientes');
  const tienePos = planTiene(plan, 'pos');
  const tienePresupuestos = planTiene(plan, 'presupuestos');
  const tienePrestamos = planTiene(plan, 'prestamos');
  const tieneCC = planTiene(plan, 'cuentaCorriente');

  // Ítems de navegación del plan (mismos que el sidebar) + Configuración.
  const navItems = [...NAV_POR_PLAN[plan].primary, ...NAV_POR_PLAN[plan].secondary];

  // Cargar datos solo la primera vez que se abre el palette, y solo lo que el plan usa.
  useEffect(() => {
    if (!open || cargando || productos.length > 0 || clientes.length > 0) return;
    setCargando(true);
    Promise.all([
      tieneProductos ? listarProductos({ soloActivos: true }) : Promise.resolve([]),
      tieneClientes ? listarClientes() : Promise.resolve([]),
    ])
      .then(([prods, clients]) => {
        setProductos(prods);
        setClientes(clients);
      })
      .catch(() => { /* silencioso — el palette sigue funcionando sin datos */ })
      .finally(() => setCargando(false));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function go(path: string) {
    onOpenChange(false);
    setSearch('');
    router.push(path);
  }

  // Limpiar búsqueda al cerrar
  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 animate-fade-up"
      onClick={() => onOpenChange(false)}
    >
      {/* Backdrop con blur */}
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        aria-hidden
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl rounded-xl border border-border/60 bg-popover/95 backdrop-blur-xl shadow-[0_0_0_1px_oklch(1_0_0_/_0.04),0_24px_64px_oklch(0_0_0_/_0.5)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Buscar" loop>
          {/* Input */}
          <div className="flex items-center gap-2.5 px-4 h-12 border-b border-border/60">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Command.Input
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder="Buscar productos, clientes, navegar..."
              className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground outline-none"
            />
            {cargando
              ? <Loader2 className="h-3.5 w-3.5 text-muted-foreground/60 animate-spin" />
              : (
                <kbd className="text-[10px] text-muted-foreground/70 font-mono px-1.5 py-0.5 rounded border border-border/60">
                  ESC
                </kbd>
              )
            }
          </div>

          {/* Lista */}
          <Command.List className="max-h-[420px] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
              Sin resultados.
            </Command.Empty>

            {/* Acciones rápidas — según lo que el plan puede hacer */}
            <Command.Group heading="Acciones rápidas" className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/50 font-medium px-2 py-1.5">
              {tienePos && <CommandItem icon={Plus} label="Nueva venta" hint="POS" onSelect={() => go('/dashboard/ventas')} />}
              {tieneProductos && <CommandItem icon={Plus} label="Nuevo producto" onSelect={() => go('/dashboard/productos/nuevo')} />}
              {tienePresupuestos && <CommandItem icon={FileText} label="Nuevo presupuesto" onSelect={() => go('/dashboard/presupuestos/nuevo')} />}
              {tienePrestamos && <CommandItem icon={Landmark} label="Nuevo préstamo" onSelect={() => go('/dashboard/prestamos/nuevo')} />}
              {tieneClientes && <CommandItem icon={Plus} label="Nuevo cliente" onSelect={() => go('/dashboard/clientes/nuevo')} />}
              {tieneCC && <CommandItem icon={BookOpen} label="Registrar pago" hint="Cuenta corriente" onSelect={() => go('/dashboard/cc')} />}
            </Command.Group>

            {/* Navegación — los mismos ítems que el sidebar del plan */}
            <Command.Group heading="Navegación" className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/50 font-medium px-2 py-1.5 mt-2">
              {navItems.map((item) => (
                <CommandItem key={item.href} icon={item.icon} label={item.label} onSelect={() => go(item.href)} />
              ))}
              <CommandItem icon={Settings} label="Configuración" onSelect={() => go('/dashboard/config')} />
            </Command.Group>

            {/* Productos */}
            {productos.length > 0 && (
              <Command.Group heading="Productos" className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/50 font-medium px-2 py-1.5 mt-2">
                {productos.slice(0, 30).map((p) => (
                  <Command.Item
                    key={p.id}
                    value={`producto ${p.nombre} ${p.codigo ?? ''}`}
                    onSelect={() => go(`/dashboard/productos/${p.id}`)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-sm aria-selected:bg-foreground/[0.06] data-[selected=true]:bg-foreground/[0.06] transition-colors"
                  >
                    <div className="h-7 w-7 rounded-md bg-muted border border-border/60 flex items-center justify-center shrink-0">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{p.nombre}</p>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-muted-foreground shrink-0">
                      {formatARS(Number(p.precioMinorista))}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Clientes */}
            {clientes.length > 0 && (
              <Command.Group heading="Clientes" className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/50 font-medium px-2 py-1.5 mt-2">
                {clientes.slice(0, 30).map((c) => (
                  <Command.Item
                    key={c.id}
                    value={`cliente ${c.razonSocial} ${c.nombreFantasia ?? ''} ${c.cuit ?? ''}`}
                    onSelect={() => go(c.habilitaCuentaCorriente && tieneCC ? `/dashboard/cc/${c.id}` : `/dashboard/clientes/${c.id}`)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-sm aria-selected:bg-foreground/[0.06] data-[selected=true]:bg-foreground/[0.06] transition-colors"
                  >
                    <div className="h-7 w-7 rounded-full bg-muted border border-border/60 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                        {c.razonSocial.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{c.razonSocial}</p>
                      <p className="text-[11px] text-muted-foreground truncate capitalize">
                        {c.tipo}
                        {c.habilitaCuentaCorriente && ' · cta. cte.'}
                      </p>
                    </div>
                    {Number(c.saldoActual) > 0 && (
                      <span className="text-xs font-mono tabular-nums text-destructive shrink-0">
                        {formatARS(Number(c.saldoActual))}
                      </span>
                    )}
                    <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer */}
          <div className="border-t border-border/60 px-3 h-9 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="font-mono px-1 py-0.5 rounded border border-border/60">↑↓</kbd>
                navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="font-mono px-1 py-0.5 rounded border border-border/60">↵</kbd>
                seleccionar
              </span>
            </span>
            <span>Gesto</span>
          </div>
        </Command>
      </div>
    </div>
  );
}

function CommandItem({
  icon: Icon, label, hint, onSelect,
}: {
  icon: React.ElementType;
  label: string;
  hint?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-sm text-foreground aria-selected:bg-foreground/[0.06] data-[selected=true]:bg-foreground/[0.06] transition-colors"
    >
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.75} />
      <span className="flex-1">{label}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </Command.Item>
  );
}
