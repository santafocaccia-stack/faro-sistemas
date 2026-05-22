'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { anularVenta } from '@/server/actions/ventas';

type Props = { ventaId: string; estado: string };

export function VentaAnularButton({ ventaId, estado }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (estado === 'anulada') return null;

  function handleAnular() {
    startTransition(async () => {
      try {
        await anularVenta(ventaId);
        toast.success('Venta anulada — el stock fue revertido');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al anular la venta');
      }
    });
  }

  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          className="h-8 gap-1.5 text-xs border-border/60 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5"
        >
          <Ban className="h-3.5 w-3.5" />
          {isPending ? 'Anulando...' : 'Anular venta'}
        </Button>
      }
      title="¿Anular esta venta?"
      description="El stock volverá a su valor anterior. Esta acción no se puede deshacer."
      confirmLabel="Sí, anular"
      onConfirm={handleAnular}
    />
  );
}
