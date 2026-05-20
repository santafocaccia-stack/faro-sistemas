import { listarProductos } from '@/server/actions/productos';
import { listarClientes } from '@/server/actions/clientes';
import { obtenerTenant } from '@/server/actions/config';
import { PosContainer } from '@/components/pos/pos-container';

export default async function VentasPage() {
  const [productos, clientes, tenant] = await Promise.all([
    listarProductos({ soloActivos: true }),
    listarClientes(),
    obtenerTenant(),
  ]);

  const consumidorFinal = clientes.find((c) => c.esConsumidorFinal);

  return (
    <PosContainer
      productos={productos}
      clientes={clientes}
      consumidorFinalId={consumidorFinal?.id ?? null}
      negocio={{
        nombre: tenant?.nombre ?? 'Mi negocio',
        cuit: tenant?.cuit ?? null,
        direccion: tenant?.direccion ?? null,
        telefono: tenant?.telefono ?? null,
      }}
    />
  );
}
