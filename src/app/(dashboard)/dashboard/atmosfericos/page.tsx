import { requireSession } from '@/server/auth/session';
import { listarPedidosDelDia } from '@/server/actions/pedidos-atmosfericos';
import { db } from '@/server/db';
import { clientes } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { byTenant } from '@/server/db/tenant-context';
import { puedeGestionar } from '@/lib/nav';
import { ListaPedidosClient } from '@/components/atmosfericos/lista-pedidos-client';

export const dynamic = 'force-dynamic';

export default async function AtmosfericosPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const session = await requireSession();
  const { fecha } = await searchParams;
  const hoy = fecha ?? new Date().toISOString().slice(0, 10);

  const [pedidos, clientesDisponibles] = await Promise.all([
    listarPedidosDelDia(hoy),
    db
      .select({
        id:          clientes.id,
        nombre:      clientes.razonSocial,
        direccion:   clientes.direccion,
        localidad:   clientes.localidad,
        litrosPozo:  clientes.litrosPozoEstimado,
        telefono:    clientes.telefono,
      })
      .from(clientes)
      .where(and(byTenant(session.tenantId, clientes), eq(clientes.activo, true)))
      .orderBy(clientes.razonSocial),
  ]);

  const esGestor = puedeGestionar(session.rol);

  return (
    <ListaPedidosClient
      pedidosIniciales={pedidos}
      clientesDisponibles={clientesDisponibles}
      fecha={hoy}
      tenantId={session.tenantId}
      esGestor={esGestor}
    />
  );
}
