'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Tipos compartidos ─────────────────────────────────────────────────────────

type Linea = {
  descripcion: string;
  cantidad: string | number;
  precioUnitario: string | number;
  subtotal: string | number;
};

type BaseProps = {
  numero: number;
  fecha: Date | string;
  clienteNombre: string;
  lineas: Linea[];
  subtotal: string | number;
  descuento: string | number;
  total: string | number;
  notas?: string | null;
  negocioNombre: string;
  negocioCuit?: string | null;
  className?: string;
};

// ── Remito PDF Button ─────────────────────────────────────────────────────────

export function RemitoPDFButton(props: BaseProps & { metodoPago?: string | null }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      // Carga lazy del renderer (no SSR-compatible)
      const [{ pdf }, { RemitoPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf-document'),
      ]);
      const blob = await pdf(<RemitoPDF {...props} />).toBlob();
      triggerDownload(blob, `remito-${String(props.numero).padStart(5, '0')}.pdf`);
    } catch (e) {
      console.error('PDF error', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={loading}
      className={`h-8 gap-1.5 text-xs font-medium border-border/60 hover:border-border ${props.className ?? ''}`}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {loading ? 'Generando...' : 'Descargar PDF'}
    </Button>
  );
}

// ── Presupuesto PDF Button ────────────────────────────────────────────────────

export function PresupuestoPDFButton(
  props: BaseProps & { validezDias: number; estado: string }
) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const [{ pdf }, { PresupuestoPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf-document'),
      ]);
      const blob = await pdf(<PresupuestoPDF {...props} />).toBlob();
      triggerDownload(blob, `presupuesto-${String(props.numero).padStart(5, '0')}.pdf`);
    } catch (e) {
      console.error('PDF error', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={loading}
      className={`h-8 gap-1.5 text-xs font-medium border-border/60 hover:border-border ${props.className ?? ''}`}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {loading ? 'Generando...' : 'Descargar PDF'}
    </Button>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
