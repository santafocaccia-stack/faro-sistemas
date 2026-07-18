import Link from 'next/link';
import { formatFechaAR } from '@/lib/fechas';
import { ClipboardList, Truck, ChevronRight, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { listarPedidos, nuevoPedido } from '@/server/actions/pedidos';
import { listarProveedores } from '@/server/actions/proveedores';

const ESTADO_CONFIG = {
  borrador:  { label: 'Borrador',  cls: 'bg-yellow-500/10 text-yellow-400' },
  enviado:   { label: 'Enviado',   cls: 'bg-blue-500/10 text-blue-400' },
  recibido:  { label: 'Recibido', cls: 'bg-emerald-500/10 text-emerald-400' },
} as const;

export default async function PedidosPage() {
  const [pedidos, proveedores] = await Promise.all([listarPedidos(), listarProveedores()]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-5xl mx-auto space-y-6 animate-fade-up">
      <PageHeader
        icon={ClipboardList}
        title="Pedidos a proveedores"
        subtitle="Se acumulan solos al vender, o armá uno a mano"
      />

      {/* Armar pedido a mano: elegí proveedor y se abre el borrador con su catálogo */}
      {proveedores.length > 0 && (
        <form action={nuevoPedido} className="panel p-3 sm:p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1 flex-1 min-w-[180px]">
            <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 block">Nuevo pedido para</label>
            <select name="proveedorId" required defaultValue="" className="h-9 bg-background border border-border rounded-md px-2.5 text-sm w-full">
              <option value="" disabled>Elegí un proveedor…</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 transition-all glow-primary"
          >
            <Plus className="h-3.5 w-3.5" /> Generar pedido
          </button>
        </form>
      )}

      {pedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Sin pedidos</p>
          <p className="text-xs text-muted-foreground mt-1">
            Los pedidos se crean automáticamente cuando se registran ventas de productos con proveedor asignado
          </p>
        </div>
      ) : (
        <div className="panel overflow-hidden divide-y divide-border/50 stagger">
          {pedidos.map(({ pedido, proveedorNombre }) => {
            const cfg = ESTADO_CONFIG[pedido.estado];
            return (
              <Link
                key={pedido.id}
                href={`/dashboard/pedidos/${pedido.id}`}
                className="list-row flex items-center gap-4 px-4 py-3.5"
              >
                <div className="icon-chip h-9 w-9 shrink-0">
                  <Truck className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{proveedorNombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFechaAR(pedido.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${cfg.cls}`}>
                  {cfg.label}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
