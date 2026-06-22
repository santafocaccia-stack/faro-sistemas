import Link from 'next/link';
import { Scale, Barcode, ScanLine, ShoppingCart, Package, ArrowRight } from 'lucide-react';
import { requireCapacidad } from '@/server/auth/plan-guard';

export const dynamic = 'force-dynamic';

const PASOS = [
  {
    icon: Package,
    titulo: '1 · Cargá tus productos por peso',
    texto: 'En Productos, marcá cada artículo como "por kg" y ponele su precio por kilo. Si usás una balanza con etiquetas, asignale a cada producto su código PLU (los 4–5 dígitos que cargás en la balanza).',
    href: '/dashboard/productos',
    cta: 'Ir a Productos',
  },
  {
    icon: ScanLine,
    titulo: '2 · Conectá la lectora',
    texto: 'La misma lectora USB del supermercado funciona. La balanza imprime una etiqueta con el peso adentro del código de barras; al escanearla, Gesto reconoce el producto por su PLU y carga el peso solo.',
    href: null,
    cta: null,
  },
  {
    icon: ShoppingCart,
    titulo: '3 · Vendé por peso en la caja',
    texto: 'En la caja, tocá un producto por kg y poné los gramos (o usá los atajos 250 g · 500 g · 1 kg). Gesto calcula el importe al instante. Si escaneás una etiqueta de balanza, entra con el peso ya cargado.',
    href: '/dashboard/ventas',
    cta: 'Ir a la caja',
  },
];

export default async function BalanzaPage() {
  await requireCapacidad('balanza');

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-3xl mx-auto space-y-6 animate-fade-up">

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Scale className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight leading-tight">Venta por peso</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tu carnicería, verdulería o fiambrería, lista para cobrar al kilo en tres pasos.
          </p>
        </div>
      </div>

      {/* Pasos */}
      <div className="space-y-3">
        {PASOS.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.titulo} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-foreground/80" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold">{p.titulo}</h2>
                  <p className="text-[13px] text-muted-foreground leading-relaxed mt-1">{p.texto}</p>
                  {p.href && p.cta && (
                    <Link
                      href={p.href}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline mt-2.5"
                    >
                      {p.cta}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cómo se lee la etiqueta */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Barcode className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Cómo lee la etiqueta de balanza</h2>
        </div>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Gesto interpreta los códigos de balanza con peso embebido (EAN-13 que empieza con
          <span className="font-mono text-foreground/80"> 2</span>): toma el
          <span className="text-foreground/80"> PLU</span> del producto y el
          <span className="text-foreground/80"> peso en gramos</span> del propio código. Así, una sola
          pasada de la lectora ya agrega el corte con su peso y su importe.
        </p>
      </div>
    </div>
  );
}
