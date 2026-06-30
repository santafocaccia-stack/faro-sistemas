'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { compartirPdf } from '@/lib/compartir-pdf';

/**
 * Botón "Compartir boleta": arma el PDF y abre el menú nativo de compartir
 * (WhatsApp directo en el celular) o lo descarga en la compu. Sin pestañas
 * nuevas ni pasos raros — un solo toque.
 */
export function BotonBoleta({
  url,
  numero,
  label = 'Compartir boleta',
  className,
}: {
  url: string;
  numero: string;
  label?: string;
  className?: string;
}) {
  const [cargando, setCargando] = useState(false);

  async function handle() {
    setCargando(true);
    try {
      const r = await compartirPdf(url, `recibo-${numero}.pdf`, {
        title: 'Boleta',
        text: 'Te paso la boleta del servicio.',
      });
      if (r === 'error') toast.error('No se pudo generar la boleta');
      else if (r === 'descargado') toast.success('Boleta descargada');
    } catch {
      toast.error('No se pudo generar la boleta');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handle}
      disabled={cargando}
      className={`h-12 px-4 text-base font-semibold glow-primary ${className ?? ''}`}
    >
      {cargando ? <Loader2 className="w-5 h-5 mr-1.5 animate-spin" /> : <FileText className="w-5 h-5 mr-1.5" />}
      {cargando ? 'Generando...' : label}
    </Button>
  );
}
