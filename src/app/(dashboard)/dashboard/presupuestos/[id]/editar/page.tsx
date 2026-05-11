import { notFound } from 'next/navigation';
import { obtenerPresupuesto } from '@/server/actions/presupuestos';
import { listarProductos } from '@/server/actions/productos';
import { listarClientes } from '@/server/actions/clientes';
import { PresupuestoForm } from '@/components/presupuesto-form';

type Props = { params: Promise<{ id: string }> };

export default async function EditarPresupuestoPage({ params }: Props) {
  const { id } = await params;

  const [data, productos, clientes] = await Promise.all([
    obtenerPresupuesto(id),
    listarProductos(),
    listarClientes(),
  ]);

  if (!data) notFound();

  const { pres, lineas } = data;

  const initialData = {
    id: pres.id,
    clienteId:     pres.clienteId,
    clienteNombre: pres.clienteNombre,
    validezDias:   pres.validezDias,
    notas:         pres.notas,
    descuento:     Number(pres.descuento),
    lineas: lineas.map((l) => ({
      productoId:     l.productoId,
      descripcion:    l.descripcion,
      cantidad:       Number(l.cantidad),
      precioUnitario: Number(l.precioUnitario),
    })),
  };

  return (
    <div className="px-6 lg:px-10 py-8 max-w-3xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Editar presupuesto</h1>
        <p className="text-sm text-muted-foreground mt-1">
          #{String(pres.numero).padStart(5, '0')} · los cambios reemplazan el contenido actual
        </p>
      </div>
      <PresupuestoForm
        productos={productos}
        clientes={clientes}
        initialData={initialData}
      />
    </div>
  );
}
