import { listarProductos } from '@/server/actions/productos';
import { listarClientes } from '@/server/actions/clientes';
import { listarDescripcionesUsadas } from '@/server/actions/presupuestos';
import { PresupuestoForm } from '@/components/presupuesto-form';

export default async function NuevaBoletaPage() {
  const [productos, clientes, sugerencias] = await Promise.all([
    listarProductos({ soloActivos: true }),
    listarClientes(),
    listarDescripcionesUsadas(),
  ]);

  return (
    <div className="px-6 lg:px-10 py-8 max-w-4xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Nueva boleta</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cargá lo que cobraste, elegí el método de pago y emití el comprobante.
        </p>
      </div>
      <PresupuestoForm productos={productos} clientes={clientes} sugerencias={sugerencias} modo="boleta" />
    </div>
  );
}
