'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ChevronRight, Droplets, MapPin, X } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatARS } from '@/lib/utils';
import type { Cliente } from '@/server/db/schema';

const tipoLabel: Record<string, string> = {
  mayorista: 'Mayorista',
  minorista: 'Minorista',
  ambos: 'Ambos',
};

export function ClientesListaClient({
  clientes,
  esAtmos,
}: {
  clientes: Cliente[];
  esAtmos: boolean;
}) {
  const [q, setQ] = useState('');

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return clientes;
    return clientes.filter((c) =>
      [c.razonSocial, c.nombreFantasia, c.direccion, c.localidad, c.telefono]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(term))
    );
  }, [q, clientes]);

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={esAtmos ? 'Buscar por nombre o dirección...' : 'Buscar cliente...'}
          className="w-full h-12 pl-11 pr-10 rounded-xl border border-input bg-card text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No se encontró ningún cliente con “{q}”.
          </p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          {/* Mobile: tarjetas */}
          <ul className="md:hidden divide-y divide-border/50">
            {filtrados.map((c) => {
              const saldo = Number(c.saldoActual);
              const dir = [c.direccion, c.localidad].filter(Boolean).join(', ');
              return (
                <li key={c.id}>
                  <Link href={`/dashboard/clientes/${c.id}`} className="list-row flex items-center gap-3 px-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold truncate text-foreground">{c.razonSocial}</p>
                      {esAtmos ? (
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          {dir && (
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />{dir}
                            </p>
                          )}
                          {c.litrosPozoEstimado && (
                            <p className="text-xs text-blue-700 flex items-center gap-1 font-medium">
                              <Droplets className="w-3.5 h-3.5" />{c.litrosPozoEstimado} L
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground truncate">
                          {tipoLabel[c.tipo]}
                          {c.telefono ? ` · ${c.telefono}` : ''}
                        </p>
                      )}
                    </div>
                    {!esAtmos && (
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className={`font-mono tabular-nums text-[13px] ${saldo > 0 ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                          {formatARS(saldo)}
                        </span>
                        {c.habilitaCuentaCorriente && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Cta. cte.
                          </span>
                        )}
                      </div>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Desktop: tabla */}
          <div className="hidden md:block">
            {esAtmos ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/60">
                    <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 pl-4">Nombre</TableHead>
                    <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Dirección</TableHead>
                    <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Litros del pozo</TableHead>
                    <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Teléfono</TableHead>
                    <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 pr-4">Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((c) => {
                    const dir = [c.direccion, c.localidad].filter(Boolean).join(', ');
                    return (
                      <TableRow key={c.id} className="relative hover:bg-accent/40 border-b border-border/40 last:border-0 cursor-pointer group">
                        <TableCell className="pl-4 py-2.5">
                          <Link href={`/dashboard/clientes/${c.id}`} className="block before:absolute before:inset-0 before:content-['']">
                            <p className="text-[13px] font-medium text-foreground">{c.razonSocial}</p>
                          </Link>
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">
                          {dir || <span className="text-muted-foreground/40">—</span>}
                        </TableCell>
                        <TableCell className="py-2.5">
                          {c.litrosPozoEstimado ? (
                            <span className="flex items-center gap-1 text-xs text-blue-700 font-medium">
                              <Droplets className="w-3.5 h-3.5" />{c.litrosPozoEstimado} L
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-muted-foreground font-mono">
                          {c.telefono ?? <span className="text-muted-foreground/40">—</span>}
                        </TableCell>
                        <TableCell className="pr-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate italic">
                          {c.notas ?? <span className="text-muted-foreground/40 not-italic">—</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/60">
                    <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 pl-4">Razón social</TableHead>
                    <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Tipo</TableHead>
                    <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Contacto</TableHead>
                    <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Cond. IVA</TableHead>
                    <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 text-right">Saldo</TableHead>
                    <TableHead className="h-10 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 pr-4">Cta. cte.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((c) => {
                    const saldo = Number(c.saldoActual);
                    return (
                      <TableRow key={c.id} className="relative hover:bg-accent/40 border-b border-border/40 last:border-0 cursor-pointer group">
                        <TableCell className="pl-4 py-2.5">
                          <Link href={`/dashboard/clientes/${c.id}`} className="block before:absolute before:inset-0 before:content-['']">
                            <p className="text-[13px] font-medium text-foreground">{c.razonSocial}</p>
                            {c.nombreFantasia && (
                              <p className="text-[11px] text-muted-foreground">{c.nombreFantasia}</p>
                            )}
                          </Link>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border border-border bg-muted text-muted-foreground">
                            {tipoLabel[c.tipo]}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-muted-foreground">
                          {c.telefono ?? c.email ?? <span className="text-muted-foreground/40">—</span>}
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-muted-foreground capitalize">
                          {c.condicionIva.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell className="py-2.5 text-right">
                          <span className={`font-mono tabular-nums text-[13px] ${saldo > 0 ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                            {formatARS(saldo)}
                          </span>
                        </TableCell>
                        <TableCell className="pr-4 py-2.5">
                          {c.habilitaCuentaCorriente ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Habilitada
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">No</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
