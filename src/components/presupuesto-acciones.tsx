'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cambiarEstadoPresupuesto, eliminarPresupuesto } from '@/server/actions/presupuestos';
import type { PresupuestoEstado } from '@/server/db/schema';

const ESTADOS: { value: PresupuestoEstado; label: string }[] = [
  { value: 'borrador',  label: 'Borrador' },
  { value: 'enviado',   label: 'Enviado' },
  { value: 'aprobado',  label: 'Aprobado' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'vencido',   label: 'Vencido' },
];

type Props = {
  id: string;
  estadoActual: string;
};

export function PresupuestoAcciones({ id, estadoActual }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [estado, setEstado] = useState<PresupuestoEstado>(estadoActual as PresupuestoEstado);

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

  function handleEliminar() {
    if (!confirm('¿Eliminar este presupuesto? Esta acción no se puede deshacer.')) return;
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
    <div className="flex items-center gap-2">
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

      <Button
        variant="ghost"
        size="sm"
        onClick={handleEliminar}
        disabled={isPending}
        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
