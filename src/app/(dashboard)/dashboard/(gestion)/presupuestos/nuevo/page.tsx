import { listarProductos } from '@/server/actions/productos';
import { listarClientes } from '@/server/actions/clientes';
import { PresupuestoForm } from '@/components/presupuesto-form';

export default async function NuevoPresupuestoPage() {
  const [productos, clientes] = await Promise.all([
    listarProductos({ soloActivos: true }),
    listarClientes(),
  ]);

  return (
    <div className="px-6 lg:px-10 py-8 max-w-4xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Nuevo presupuesto</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Armá el presupuesto y descargalo en PDF para enviárselo al cliente
        </p>
      </div>
      <PresupuestoForm productos={productos} clientes={clientes} />
    </div>
  );
}
