import Link from 'next/link';
import { Plus, Package } from 'lucide-react';
import { listarProductos } from '@/server/actions/productos';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatARS, formatKg } from '@/lib/utils';

export default async function ProductosPage() {
  const productos = await listarProductos();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-sm text-muted-foreground">
            {productos.length} {productos.length === 1 ? 'producto' : 'productos'} en el catálogo
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/productos/nuevo">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo producto
          </Link>
        </Button>
      </div>

      {productos.length === 0 ? (
        <div className="border rounded-lg bg-background p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">Aún no hay productos</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Empezá cargando los productos que vendés.
          </p>
          <Button asChild>
            <Link href="/dashboard/productos/nuevo">
              <Plus className="h-4 w-4 mr-2" />
              Cargar primer producto
            </Link>
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg bg-background overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">P. Mayorista</TableHead>
                <TableHead className="text-right">P. Minorista</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productos.map((p) => {
                const unidad = p.tipoUnidad === 'por_kg' ? 'kg' : 'un';
                const stockNum = Number(p.stockActual);
                const stockBajo = p.stockMinimo && stockNum <= Number(p.stockMinimo);
                return (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/40">
                    <TableCell>
                      <Link href={`/dashboard/productos/${p.id}`} className="block">
                        <div className="font-medium">{p.nombre}</div>
                        {p.codigo && (
                          <div className="text-xs text-muted-foreground">{p.codigo}</div>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.categoria ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={stockBajo ? 'text-destructive font-medium' : ''}>
                        {p.tipoUnidad === 'por_kg' ? formatKg(stockNum) : `${stockNum} ${unidad}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatARS(Number(p.precioMayorista))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatARS(Number(p.precioMinorista))}
                    </TableCell>
                    <TableCell>
                      {p.activo ? (
                        <Badge variant="secondary">Activo</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Inactivo</Badge>
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
