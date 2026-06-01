import Link from 'next/link';
import { Plus, Truck, Phone, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { listarProveedores } from '@/server/actions/proveedores';

const DIAS_LABEL: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom',
};

export default async function ProveedoresPage() {
  const provs = await listarProveedores();

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-6xl mx-auto space-y-6 animate-fade-up">
      <PageHeader
        icon={Truck}
        title="Proveedores"
        subtitle="Proveedores y sus días de pedido"
        action={
          <Button asChild className="glow-primary h-9">
            <Link href="/dashboard/proveedores/nuevo">
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Nuevo proveedor</span>
            </Link>
          </Button>
        }
      />

      {provs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
            <Truck className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Sin proveedores</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Agregá tu primer proveedor para empezar a trackear los pedidos
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/proveedores/nuevo">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Crear proveedor
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
          {provs.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/proveedores/${p.id}`}
              className="panel panel-hover p-4 group"
            >
              <div className="flex items-start gap-3">
                <div className="icon-chip h-9 w-9 shrink-0">
                  <Truck className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {p.nombre}
                  </p>
                  {p.contacto && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" />
                      {p.contacto}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {p.diasPedido.length > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                    <div className="flex gap-1 flex-wrap">
                      {p.diasPedido.map((d) => (
                        <span
                          key={d}
                          className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded"
                        >
                          {DIAS_LABEL[d] ?? d}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground/50">Sin días configurados</p>
                )}

                <div className="flex gap-3 text-[11px] text-muted-foreground">
                  <span>May: <span className="text-foreground font-medium">{p.markupMayorista}%</span></span>
                  <span>Min: <span className="text-foreground font-medium">{p.markupMinorista}%</span></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
