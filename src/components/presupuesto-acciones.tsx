'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2, Check, Wallet, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  cambiarEstadoPresupuesto, eliminarPresupuesto, marcarCobrado, revertirCobro,
} from '@/server/actions/presupuestos';
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
};

export function PresupuestoAcciones({ id, estadoActual }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [estado, setEstado] = useState<PresupuestoEstado>(estadoActual as PresupuestoEstado);
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo');

  const cobrado = estado === 'cobrado';

  function handleEstado(nuevoEstado: PresupuestoEstado) {
    if (nuevoEstado === estado) return;
    setEstado(nuevoEstado);
    startTransition(async () => {
      try {
        await cambiarEstadoPresupuesto(id, nuevoEstado);
        toast.success('Estado actualizado');
      } catch {
        toast.error('Error al cambiar estado');
        setEstado(estadoActual as PresupuestoEstado);
      }
    });
  }

  function handleCobrar() {
    startTransition(async () => {
      const r = await marcarCobrado(id, metodo);
      if (r.ok) {
        setEstado('cobrado');
        toast.success('Cobro registrado');
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

          {/* Registrar cobro: método + botón */}
          <Select value={metodo} onValueChange={(v) => setMetodo(v as MetodoPago)}>
            <SelectTrigger className="h-8 text-xs border-border/60 bg-background w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METODOS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={isPending}
            onClick={handleCobrar}
            className="h-8 glow-primary"
          >
            <Wallet className="h-3.5 w-3.5 mr-1.5" />
            Registrar cobro
          </Button>
        </>
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
