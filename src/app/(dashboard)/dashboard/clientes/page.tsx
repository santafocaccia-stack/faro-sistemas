import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import { listarClientes } from '@/server/actions/clientes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatARS } from '@/lib/utils';

const tipoBadge: Record<string, string> = {
  mayorista: 'Mayorista',
  minorista: 'Minorista',
  ambos: 'Ambos',
};

export default async function ClientesPage() {
  const clientes = await listarClientes();
  const visibles = clientes;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {visibles.length} {visibles.length === 1 ? 'cliente' : 'clientes'} registrados
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/clientes/nuevo">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo cliente
          </Link>
        </Button>
      </div>

      {visibles.length === 0 ? (
        <div className="border rounded-lg bg-background p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">Aún no hay clientes</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Cargá los clientes mayoristas o minoristas del negocio.
          </p>
          <Button asChild>
            <Link href="/dashboard/clientes/nuevo">
              <Plus className="h-4 w-4 mr-2" />
              Cargar primer cliente
            </Link>
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg bg-background overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razón social</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Cond. IVA</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Cta. cte.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibles.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40">
                  <TableCell>
                    <Link href={`/dashboard/clientes/${c.id}`} className="block">
                      <div className="font-medium">{c.razonSocial}</div>
                      {c.nombreFantasia && (
                        <div className="text-xs text-muted-foreground">{c.nombreFantasia}</div>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{tipoBadge[c.tipo]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.telefono ?? c.email ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground capitalize">
                    {c.condicionIva.replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className={Number(c.saldoActual) > 0 ? 'text-destructive font-medium' : ''}>
                      {formatARS(Number(c.saldoActual))}
                    </span>
                  </TableCell>
                  <TableCell>
                    {c.habilitaCuentaCorriente ? (
                      <Badge variant="secondary">Habilitada</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">No</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
