'use client';

import { useState, useTransition } from 'react';
import { Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { revertirMovimiento } from '@/server/actions/cuenta-corriente';

type Props = {
  movimientoId: string;
  descripcion: string;
};

export function RevertirMovimientoBtn({ movimientoId, descripcion }: Props) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleConfirmar() {
    if (!motivo.trim()) {
      toast.error('Indicá el motivo de la reversión');
      return;
    }
    startTransition(async () => {
      const result = await revertirMovimiento({ movimientoId, motivo });
      if (result.ok) {
        toast.success('Movimiento revertido correctamente');
        setOpen(false);
        setMotivo('');
      } else {
        toast.error(result.error ?? 'No se pudo revertir el movimiento');
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground/40 hover:text-warning hover:bg-warning/10 transition-colors"
          title="Revertir movimiento"
        >
          <Undo2 className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revertir movimiento</AlertDialogTitle>
          <AlertDialogDescription className="space-y-1">
            <span className="block">
              Se generará un movimiento compensatorio que anula el efecto de:
            </span>
            <span className="block font-medium text-foreground/80 text-[13px] bg-muted/50 rounded px-2.5 py-1.5 mt-2">
              {descripcion}
            </span>
            <span className="block mt-2 text-xs">
              El registro original no se modifica. La operación es irreversible.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5 py-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
            Motivo <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="Ej: error de carga, pago duplicado…"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirmar()}
            disabled={isPending}
            autoFocus
            className="h-9 bg-background/40 border-border/60 text-sm"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirmar}
            disabled={isPending || !motivo.trim()}
          >
            {isPending ? 'Revirtiendo…' : 'Confirmar reversión'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
