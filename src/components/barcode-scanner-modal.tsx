'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertCircle, Loader2, ShieldOff } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  onDetected: (codigo: string) => void;
};

type Estado =
  | 'inicializando'      // pidiendo permiso + iniciando
  | 'escaneando'         // todo ok, leyendo
  | 'sin-permiso'        // usuario rechazó o ya estaba bloqueado
  | 'no-soportado'       // dispositivo sin cámara
  | 'no-seguro'          // HTTPS requerido
  | 'error';

/**
 * Modal de escaneo de código de barras usando la cámara del dispositivo.
 *
 * Al abrir, llama directamente a getUserMedia() para que aparezca el prompt
 * nativo del navegador inmediatamente. Sin botones intermedios.
 *
 * Soporta EAN-13, EAN-8, Code 128, UPC-A y QR.
 */
export function BarcodeScannerModal({ open, onClose, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [estado, setEstado] = useState<Estado>('inicializando');
  const [error, setError] = useState<string>('');

  function cleanup() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    if (!open) {
      cleanup();
      setEstado('inicializando');
      setError('');
      return;
    }

    let cancelado = false;

    async function arrancar() {
      // Validaciones tempranas
      const isSecure = window.isSecureContext || window.location.hostname === 'localhost';
      if (!isSecure) { setEstado('no-seguro'); return; }
      if (!navigator.mediaDevices?.getUserMedia) { setEstado('no-soportado'); return; }

      try {
        // Pedir cámara — esto dispara el prompt nativo
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelado) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((t) => t.stop());
          setEstado('error');
          setError('No se pudo conectar el video');
          return;
        }
        video.srcObject = stream;
        await video.play();

        // Cargar zxing diferido
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        if (cancelado) return;
        const reader = new BrowserMultiFormatReader();

        const controls = await reader.decodeFromVideoElement(video, (result) => {
          if (result && !cancelado) {
            const codigo = result.getText();
            beep();
            cleanup();
            onDetected(codigo);
          }
        });

        if (cancelado) { controls.stop(); return; }
        controlsRef.current = controls;
        setEstado('escaneando');
      } catch (err) {
        if (cancelado) return;
        const msg = err instanceof Error ? err.message : String(err);
        const name = err instanceof Error ? err.name : '';

        if (name === 'NotAllowedError' || msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
          setEstado('sin-permiso');
        } else if (name === 'NotFoundError' || msg.toLowerCase().includes('not found')) {
          setEstado('no-soportado');
        } else {
          setEstado('error');
          setError(msg);
        }
      }
    }

    arrancar();

    return () => {
      cancelado = true;
      cleanup();
    };
  }, [open, onDetected]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full sm:max-w-md sm:mx-4 bg-card sm:rounded-2xl rounded-t-2xl overflow-hidden border border-border shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" strokeWidth={2} />
            <h3 className="text-sm font-semibold">Escanear código</h3>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="relative aspect-[4/3] bg-black overflow-hidden">

          <video
            ref={videoRef}
            className={cn(
              'absolute inset-0 h-full w-full object-cover',
              estado === 'escaneando' ? 'opacity-100' : 'opacity-0',
            )}
            playsInline
            muted
            autoPlay
          />

          {/* Overlay mira */}
          {estado === 'escaneando' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-3/4 h-1/2 max-w-xs">
                <div className="absolute top-0 left-0 h-6 w-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 h-6 w-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
                <div className="absolute inset-x-0 top-1/2 h-px bg-primary shadow-[0_0_8px_oklch(0.68_0.19_43)] animate-pulse" />
              </div>
            </div>
          )}

          {estado === 'inicializando' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-xs">Esperando permisos de cámara...</p>
            </div>
          )}

          {estado === 'sin-permiso' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldOff className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium">Cámara bloqueada</p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-[280px] leading-relaxed">
                  Tocá el ícono de candado 🔒 a la izquierda de la URL → Cámara → Permitir, y volvé a entrar.
                </p>
              </div>
            </div>
          )}

          {estado === 'no-soportado' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium">No hay cámara disponible</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Este dispositivo no tiene cámara o el navegador no la soporta.
                </p>
              </div>
            </div>
          )}

          {estado === 'no-seguro' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium">Conexión no segura</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  La cámara requiere HTTPS.
                </p>
              </div>
            </div>
          )}

          {estado === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium">Error</p>
                <p className="text-[11px] text-muted-foreground mt-1 break-words max-w-[260px]">
                  {error}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 text-center border-t border-border">
          <p className="text-[11px] text-muted-foreground">
            {estado === 'escaneando'
              ? 'Apuntá la cámara al código de barras'
              : 'Aceptá el permiso de cámara'}
          </p>
        </div>
      </div>
    </div>
  );
}

function beep() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextCtor();
    const oscilador = ctx.createOscillator();
    const ganancia = ctx.createGain();
    oscilador.connect(ganancia);
    ganancia.connect(ctx.destination);
    oscilador.frequency.value = 880;
    ganancia.gain.value = 0.15;
    oscilador.start();
    oscilador.stop(ctx.currentTime + 0.08);
    setTimeout(() => ctx.close(), 200);
  } catch {
    // ignorar
  }
}
