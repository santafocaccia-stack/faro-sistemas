import { requireSession } from '@/server/auth/session';
import { listarPedidosDelDia } from '@/server/actions/pedidos-atmosfericos';
import { db } from '@/server/db';
import { clientes, tenants } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { byTenant } from '@/server/db/tenant-context';
import { puedeGestionar } from '@/lib/nav';
import { paisDesdeZonaHoraria } from '@/lib/geo';
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

  const [pedidos, clientesDisponibles, tenantRow] = await Promise.all([
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
    db
      .select({ zonaHoraria: tenants.zonaHoraria })
      .from(tenants)
      .where(eq(tenants.id, session.tenantId))
      .limit(1),
  ]);

  const esGestor = puedeGestionar(session.rol);
  const pais = paisDesdeZonaHoraria(tenantRow[0]?.zonaHoraria);

  return (
    <ListaPedidosClient
      pedidosIniciales={pedidos}
      clientesDisponibles={clientesDisponibles}
      fecha={hoy}
      tenantId={session.tenantId}
      esGestor={esGestor}
      pais={pais}
    />
  );
}
