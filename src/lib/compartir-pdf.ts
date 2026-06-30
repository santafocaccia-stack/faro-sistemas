/**
 * Compartir un PDF de la forma más directa posible:
 *  - En el celular (touch): abre el menú nativo "Compartir" con el archivo
 *    adjunto → el usuario elige WhatsApp y manda la boleta de una.
 *  - En la compu: descarga el PDF (la Web Share de archivos es errática en
 *    desktop y no ofrece "descargar").
 *
 * Reutiliza el patrón ya probado del ticket del POS.
 */
export type CompartirResultado = 'compartido' | 'descargado' | 'cancelado' | 'error';

export async function compartirPdf(
  url: string,
  filename: string,
  opts?: { title?: string; text?: string },
): Promise<CompartirResultado> {
  const esTouch =
    typeof window !== 'undefined' &&
    window.matchMedia('(pointer: coarse)').matches;

  // Desktop → descarga directa
  if (!esTouch) {
    descargar(url, filename);
    return 'descargado';
  }

  // Mobile → menú nativo de compartir con el archivo
  if (typeof navigator !== 'undefined' && 'canShare' in navigator) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('No se pudo generar el PDF');
      const blob = await res.blob();
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: opts?.title, text: opts?.text });
        return 'compartido';
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'cancelado';
      // cualquier otro error → caemos en descarga
    }
  }

  descargar(url, filename);
  return 'descargado';
}

function descargar(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
