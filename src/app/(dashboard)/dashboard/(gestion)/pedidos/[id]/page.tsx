import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { obtenerPedido } from '@/server/actions/pedidos';
import { obtenerTenant } from '@/server/actions/config';
import { PedidoDetalle } from './pedido-detalle';

type Props = { params: Promise<{ id: string }> };

export default async function PedidoPage({ params }: Props) {
  const { id } = await params;
  const [data, tenant] = await Promise.all([
    obtenerPedido(id),
    obtenerTenant(),
  ]);
  if (!data) notFound();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/pedidos"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{data.proveedor.nombre}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pedido · {new Date(data.pedido.createdAt).toLocaleDateString('es-AR', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </p>
        </div>
      </div>

      <PedidoDetalle data={data} negocioNombre={tenant?.nombre ?? 'Mi negocio'} />
    </div>
  );
}
