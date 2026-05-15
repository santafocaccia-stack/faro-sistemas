import { ProveedorForm } from '@/components/proveedor-form';

export default function NuevoProveedorPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Nuevo proveedor</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Completá los datos del proveedor y sus días de pedido
        </p>
      </div>
      <ProveedorForm />
    </div>
  );
}
