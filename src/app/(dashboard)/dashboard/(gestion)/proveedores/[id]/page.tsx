import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, ClipboardList } from 'lucide-react';
import { ProveedorForm } from '@/components/proveedor-form';
import { obtenerProveedor } from '@/server/actions/proveedores';
import { nuevoPedido } from '@/server/actions/pedidos';
import { formatARS } from '@/lib/utils';

type Props = { params: Promise<{ id: string }> };

export default async function ProveedorPage({ params }: Props) {
  const { id } = await params;
  const data = await obtenerProveedor(id);
  if (!data) notFound();

  const { vinculados, ...proveedor } = data;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/proveedores"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">{proveedor.nombre}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Editar proveedor</p>
        </div>

        {/* Generar pedido a este proveedor (crea/abre el borrador y va al detalle) */}
        <form action={nuevoPedido}>
          <input type="hidden" name="proveedorId" value={proveedor.id} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 transition-all glow-primary"
          >
            <ClipboardList className="h-3.5 w-3.5" /> Generar pedido
          </button>
        </form>
      </div>

      <ProveedorForm proveedor={proveedor} />

      {/* Productos vinculados */}
      {vinculados.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-[0.08em]">
            Productos vinculados ({vinculados.length})
          </h2>
          <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
            {vinculados.map(({ rel, producto }) => (
              <Link
                key={rel.id}
                href={`/dashboard/productos/${producto.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{producto.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    Costo: {formatARS(Number(rel.precioCosto))}
                    {rel.esPrincipal && (
                      <span className="ml-2 text-primary font-medium">· Principal</span>
                    )}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground shrink-0">
                  <p>May: {rel.markupMayorista ?? proveedor.markupMayorista}%</p>
                  <p>Min: {rel.markupMinorista ?? proveedor.markupMinorista}%</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
