import { listarProductos } from '@/server/actions/productos';
import { listarClientes } from '@/server/actions/clientes';
import { PosMinorista } from './pos';

export default async function VentaMinoristaPage() {
  const [productos, clientes] = await Promise.all([
    listarProductos({ soloActivos: true }),
    listarClientes(),
  ]);

  const consumidorFinal = clientes.find((c) => c.esConsumidorFinal);
  const clientesMinorista = clientes.filter(
    (c) => c.tipo === 'minorista' || c.tipo === 'ambos'
  );

  return (
    <PosMinorista
      productos={productos}
      clientes={clientesMinorista}
      consumidorFinalId={consumidorFinal?.id ?? null}
    />
  );
}
