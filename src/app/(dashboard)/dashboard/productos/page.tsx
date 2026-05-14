import Link from 'next/link';
import { Plus, Package } from 'lucide-react';
import { listarProductos } from '@/server/actions/productos';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatARS, formatKg } from '@/lib/utils';

export default async function ProductosPage() {
  const productos = await listarProductos();
  const stockBajoCount = productos.filter(
    (p) => p.stockMinimo && Number(p.stockActual) <= Number(p.stockMinimo)
  ).length;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-6xl mx-auto space-y-8 animate-fade-up">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Productos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {productos.length} {productos.length === 1 ? 'producto' : 'productos'} en el catálogo
            {stockBajoCount > 0 && (
              <span className="text-warning"> · {stockBajoCount} con stock bajo</span>
            )}
          </p>
        </div>
        <Link
          href="/dashboard/productos/nuevo"
          className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 transition-all glow-primary"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
          Nuevo producto
        </Link>
      </div>

      {productos.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-14 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/8 border border-primary/15 mx-auto mb-4 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium mb-1">Catálogo vacío</p>
          <p className="text-xs text-muted-foreground mb-5 max-w-sm mx-auto">
            Empezá cargando los productos que vendés. Podés definir precios diferenciados para minorista y mayorista.
          </p>
          <Link
            href="/dashboard/productos/nuevo"
            className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 transition-all glow-primary"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
            Cargar primer producto
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/60">
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 pl-4">Producto</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Categoría</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 text-right">Stock</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 text-right">P. Mayor.</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 text-right">P. Minor.</TableHead>
                <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 pr-4">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productos.map((p) => {
                const unidad = p.tipoUnidad === 'por_kg' ? 'kg' : 'un';
                const stockNum = Number(p.stockActual);
                const stockBajo = p.stockMinimo && stockNum <= Number(p.stockMinimo);
                return (
                  <TableRow key={p.id} className="hover:bg-white/[0.02] border-b border-border/40 last:border-0 cursor-pointer group">
                    <TableCell className="pl-4 py-2.5">
                      <Link href={`/dashboard/productos/${p.id}`} className="block">
                        <p className="text-[13px] font-medium">{p.nombre}</p>
                        {p.codigo && (
                          <p className="text-[11px] text-muted-foreground font-mono">{p.codigo}</p>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-muted-foreground">
                      {p.categoria ?? <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <span className={`font-mono tabular-nums text-[13px] ${stockBajo ? 'text-warning font-semibold' : ''}`}>
                        {p.tipoUnidad === 'por_kg' ? formatKg(stockNum) : `${stockNum} ${unidad}`}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-mono tabular-nums text-[13px] text-muted-foreground">
                      {formatARS(Number(p.precioMayorista))}
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-mono tabular-nums text-[13px]">
                      {formatARS(Number(p.precioMinorista))}
                    </TableCell>
                    <TableCell className="pr-4 py-2.5">
                      {p.activo ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                          Inactivo
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
