'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronLeft, CheckCircle2, XCircle, Droplets, DollarSign, MapPin } from 'lucide-react';
import { formatARS } from '@/lib/utils';
import type { DiaHistorial } from '@/server/actions/pedidos-atmosfericos';

const METODO_LABEL: Record<string, string> = {
  efectivo:      'Efectivo',
  transferencia: 'Transferencia',
  otro:          'Otro',
};

function formatFecha(fechaStr: string) {
  const d = new Date(fechaStr + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function TarjetaPedido({ pedido }: { pedido: DiaHistorial['pedidos'][number] }) {
  const completado = pedido.estado === 'completado';
  const cancelado  = pedido.estado === 'cancelado';
  const nombre = pedido.clienteNombre ?? pedido.nombreContacto ?? 'Sin nombre';
  const dir    = [pedido.direccion, pedido.localidad].filter(Boolean).join(', ');

  return (
    <div className={`rounded-xl border px-4 py-3 flex flex-col gap-1.5 ${cancelado ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{nombre}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" />{dir}
          </p>
        </div>
        <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${
          completado ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
          : cancelado ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
          : 'bg-muted text-muted-foreground'
        }`}>
          {completado ? 'Completado' : cancelado ? 'Cancelado' : pedido.estado}
        </span>
      </div>

      {completado && (
        <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
          {pedido.litrosExtraidos && (
            <span className="flex items-center gap-1">
              <Droplets className="w-3 h-3" />
              {pedido.litrosExtraidos} L extraídos
            </span>
          )}
          {pedido.montoCobrado && (
            <span className="flex items-center gap-1 text-foreground font-medium">
              <DollarSign className="w-3 h-3" />
              {formatARS(Number(pedido.montoCobrado))}
              {pedido.metodoPago && (
                <span className="font-normal text-muted-foreground">
                  · {METODO_LABEL[pedido.metodoPago] ?? pedido.metodoPago}
                </span>
              )}
            </span>
          )}
          {pedido.notas && (
            <span className="w-full text-muted-foreground italic">{pedido.notas}</span>
          )}
        </div>
      )}
    </div>
  );
}

function TarjetaDia({ dia }: { dia: DiaHistorial }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors text-left"
        onClick={() => setAbierto((v) => !v)}
      >
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-sm">{capitalize(formatFecha(dia.fecha))}</span>
          <span className="text-xs text-muted-foreground">
            {dia.pedidos.length} pedido{dia.pedidos.length !== 1 ? 's' : ''}
            {' · '}
            {dia.totalCompletados} completado{dia.totalCompletados !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {dia.totalCobrado > 0 && (
            <span className="font-semibold text-sm text-green-600 dark:text-green-400">
              {formatARS(dia.totalCobrado)}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${abierto ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {abierto && (
        <div className="flex flex-col gap-2 px-4 pb-4 border-t pt-3">
          {dia.pedidos.map((p) => (
            <TarjetaPedido key={p.id} pedido={p} />
          ))}
        </div>
      )}
    </div>
  );
}

export function HistorialClient({ dias }: { dias: DiaHistorial[] }) {
  if (dias.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/atmosfericos" className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Historial</h1>
        </div>
        <div className="text-center py-16 text-muted-foreground text-sm">
          No hay días anteriores todavía.
        </div>
      </div>
    );
  }

  const totalDias     = dias.length;
  const totalPedidos  = dias.reduce((s, d) => s + d.pedidos.length, 0);
  const totalCobrado  = dias.reduce((s, d) => s + d.totalCobrado, 0);

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard/atmosfericos" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historial</h1>
          <p className="text-sm text-muted-foreground">
            {totalDias} día{totalDias !== 1 ? 's' : ''} · {totalPedidos} pedidos
          </p>
        </div>
      </div>

      {/* Totales globales */}
      {totalCobrado > 0 && (
        <div className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total cobrado (histórico)</span>
          <span className="font-bold text-lg">{formatARS(totalCobrado)}</span>
        </div>
      )}

      {/* Lista de días */}
      <div className="flex flex-col gap-3">
        {dias.map((dia) => (
          <TarjetaDia key={dia.fecha} dia={dia} />
        ))}
      </div>
    </div>
  );
}
