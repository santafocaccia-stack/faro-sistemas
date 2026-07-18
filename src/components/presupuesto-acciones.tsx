'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2, Check, Wallet, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  cambiarEstadoPresupuesto, eliminarPresupuesto, registrarCobro, revertirCobro,
} from '@/server/actions/presupuestos';
import { formatARS } from '@/lib/utils';
import type { PresupuestoEstado, MetodoPago } from '@/server/db/schema';

/* 'cobrado' no es un estado manual: se setea con el botón "Registrar cobro". */
const ESTADOS: { value: PresupuestoEstado; label: string }[] = [
  { value: 'borrador',  label: 'Borrador' },
  { value: 'enviado',   label: 'Enviado' },
  { value: 'aprobado',  label: 'Aprobado' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'vencido',   label: 'Vencido' },
];

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: 'efectivo',      label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'mercado_pago',  label: 'Mercado Pago' },
  { value: 'cheque',        label: 'Cheque' },
];

type Props = {
  id: string;
  estadoActual: string;
  total: number;
  montoCobrado: number;
  numero: number;
  clienteId?: string | null;
  clienteNombre?: string | null;
};

export function PresupuestoAcciones({ id, estadoActual, total, montoCobrado, numero, clienteId, clienteNombre }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [estado, setEstado] = useState<PresupuestoEstado>(estadoActual as PresupuestoEstado);
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo');
  const saldo = Math.max(total - montoCobrado, 0);
  const [dialogoCobro, setDialogoCobro] = useState(false);
  const [monto, setMonto] = useState('');

  const cobrado = estado === 'cobrado';

  function handleEstado(nuevoEstado: PresupuestoEstado) {
    if (nuevoEstado === estado) return;
    setEstado(nuevoEstado);
    startTransition(async () => {
      try {
        await cambiarEstadoPresupuesto(id, nuevoEstado);
        if (nuevoEstado === 'aprobado') {
          const titulo = `Presupuesto #${String(numero).padStart(5, '0')}${clienteNombre ? ` · ${clienteNombre}` : ''}`;
          toast.success('Presupuesto aprobado', {
            description: '¿Lo agendamos?',
            duration: 12_000, // que dé tiempo a tocar "Agendar"
            action: {
              label: 'Agendar',
              onClick: () =>
                router.push(
                  `/dashboard/agenda?nuevo=1&titulo=${encodeURIComponent(titulo)}${clienteId ? `&clienteId=${clienteId}` : ''}`,
                ),
            },
          });
        } else {
          toast.success('Estado actualizado');
        }
      } catch {
        toast.error('Error al cambiar estado');
        setEstado(estadoActual as PresupuestoEstado);
      }
    });
  }

  function abrirDialogoCobro() {
    setMonto(String(saldo));
    setDialogoCobro(true);
  }

  function handleCobrar() {
    const m = Number(monto);
    if (!Number.isFinite(m) || m <= 0) { toast.error('Ingresá un monto válido'); return; }
    startTransition(async () => {
      const r = await registrarCobro(id, m, metodo);
      if (r.ok) {
        setDialogoCobro(false);
        if (r.saldo <= 0) {
          setEstado('cobrado');
          toast.success('Cobro registrado — presupuesto cobrado por completo');
        } else {
          toast.success(`Seña registrada — queda pendiente ${formatARS(r.saldo)}`);
        }
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  function handleRevertirCobro() {
    startTransition(async () => {
      const r = await revertirCobro(id);
      if (r.ok) {
        setEstado('aprobado');
        toast.success('Cobro revertido');
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  function handleEliminar() {
    startTransition(async () => {
      try {
        await eliminarPresupuesto(id);
        toast.success('Presupuesto eliminado');
        router.push('/dashboard/presupuestos');
      } catch {
        toast.error('Error al eliminar el presupuesto');
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
      {cobrado ? (
        <>
          <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold bg-success/10 text-success border border-success/20">
            <Check className="h-3.5 w-3.5" />
            Cobrado
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={handleRevertirCobro}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Undo2 className="h-3.5 w-3.5 mr-1" />
            Revertir cobro
          </Button>
        </>
      ) : (
        <>
          <Select value={estado} onValueChange={(v) => handleEstado(v as PresupuestoEstado)}>
            <SelectTrigger className="h-8 text-xs border-border/60 bg-background w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS.map((e) => (
                <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {montoCobrado > 0 && (
            <span className="inline-flex items-center h-8 px-2.5 rounded-md text-xs font-semibold bg-warning/10 text-warning border border-warning/20">
              Señado {formatARS(montoCobrado)}
            </span>
          )}
          <Button
            size="sm"
            disabled={isPending}
            onClick={abrirDialogoCobro}
            className="h-8 glow-primary"
          >
            <Wallet className="h-3.5 w-3.5 mr-1.5" />
            Registrar cobro
          </Button>
        </>
      )}

      {/* Diálogo de cobro: monto (total o seña) + método + confirmación */}
      {dialogoCobro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDialogoCobro(false)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-sm font-semibold">Registrar cobro</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {montoCobrado > 0
                  ? <>Ya señado {formatARS(montoCobrado)} · saldo {formatARS(saldo)}</>
                  : <>Total del presupuesto: {formatARS(total)}</>}
              </p>
            </div>
            <label className="space-y-1 block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">¿Cuánto te pagan ahora?</span>
              <Input
                type="number" min="1" step="0.01" autoFocus
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="h-10 bg-background border-border text-base font-mono text-right"
              />
              {Number(monto) > 0 && Number(monto) < saldo - 0.01 && (
                <p className="text-[11px] text-warning">Seña: quedará pendiente {formatARS(saldo - Number(monto))}</p>
              )}
            </label>
            <label className="space-y-1 block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">Método</span>
              <Select value={metodo} onValueChange={(v) => setMetodo(v as MetodoPago)}>
                <SelectTrigger className="h-9 text-sm border-border bg-background w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METODOS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setDialogoCobro(false)}>Cancelar</Button>
              <Button size="sm" className="glow-primary" disabled={isPending || !(Number(monto) > 0)} onClick={handleCobrar}>
                <Wallet className="h-3.5 w-3.5 mr-1.5" />
                Cobrar {Number(monto) > 0 ? formatARS(Number(monto)) : ''}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        trigger={
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        }
        title="¿Eliminar este presupuesto?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar"
        onConfirm={handleEliminar}
      />
    </div>
  );
}
