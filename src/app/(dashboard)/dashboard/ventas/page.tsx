import { listarProductos } from '@/server/actions/productos';
import { listarClientes } from '@/server/actions/clientes';
import { listarCategorias } from '@/server/actions/categorias';
import { obtenerTenant } from '@/server/actions/config';
import { PosContainer } from '@/components/pos/pos-container';

export default async function VentasPage() {
  const [productos, clientes, categorias, tenant] = await Promise.all([
    listarProductos({ soloActivos: true }),
    listarClientes(),
    listarCategorias(),
    obtenerTenant(),
  ]);

  const consumidorFinal = clientes.find((c) => c.esConsumidorFinal);

  return (
    <PosContainer
      productos={productos}
      clientes={clientes}
      categorias={categorias}
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
