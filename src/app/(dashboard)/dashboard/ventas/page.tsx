import { listarProductos } from '@/server/actions/productos';
import { listarClientes } from '@/server/actions/clientes';
import { PosVenta } from '@/components/pos-venta';

export default async function VentasPage() {
  const [productos, clientes] = await Promise.all([
    listarProductos({ soloActivos: true }),
    listarClientes(),
  ]);

  const consumidorFinal = clientes.find((c) => c.esConsumidorFinal);

  return (
    <PosVenta
      productos={productos}
      clientes={clientes}
      consumidorFinalId={consumidorFinal?.id ?? null}
    />
  );
}
