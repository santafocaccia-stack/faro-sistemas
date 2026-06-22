'use client';

import { Download, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Botones de descarga PDF — la generación ocurre en el servidor
 * (/api/pdf/remito/[id] y /api/pdf/presupuesto/[id]) para evitar
 * que @react-pdf/renderer sea procesado por Turbopack en el cliente.
 */

export function RemitoPDFButton({ ventaId, className }: { ventaId: string; className?: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      asChild
      className={`h-8 gap-1.5 text-xs font-medium border-border/60 hover:border-border ${className ?? ''}`}
    >
      <a href={`/api/pdf/remito/${ventaId}`} download>
        <Download className="h-3.5 w-3.5" />
        Descargar PDF
      </a>
    </Button>
  );
}

export function PresupuestoPDFButton({ presupuestoId, className }: { presupuestoId: string; className?: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      asChild
      className={`h-8 gap-1.5 text-xs font-medium border-border/60 hover:border-border ${className ?? ''}`}
    >
      <a href={`/api/pdf/presupuesto/${presupuestoId}`} download>
        <Download className="h-3.5 w-3.5" />
        Descargar PDF
      </a>
    </Button>
  );
}

/** Comprobante de pago (RECIBO) de un presupuesto ya cobrado. */
export function ReciboPDFButton({ presupuestoId, className }: { presupuestoId: string; className?: string }) {
  return (
    <Button
      size="sm"
      asChild
      className={`h-8 gap-1.5 text-xs font-medium glow-primary ${className ?? ''}`}
    >
      <a href={`/api/pdf/presupuesto/${presupuestoId}?recibo=1`} download>
        <Receipt className="h-3.5 w-3.5" />
        Descargar recibo
      </a>
    </Button>
  );
}
