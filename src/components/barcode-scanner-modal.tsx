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
  | 'pidiendo-permiso'  // mostrando botón "Activar cámara"
  | 'inicializando'      // permisos ok, cargando libs y stream
  | 'escaneando'         // todo ok, leyendo
  | 'sin-permiso'        // usuario rechazó o ya estaba bloqueado
  | 'no-soportado'       // dispositivo sin cámara
  | 'no-seguro'          // HTTPS requerido
  | 'error';

/**
 * Modal de escaneo de código de barras usando la cámara del dispositivo.
 *
 * Flujo en dos pasos para máxima compatibilidad (especialmente iOS Safari):
 *   1) El usuario ve un botón "Activar cámara"
 *   2) Al tocarlo, se llama getUserMedia() dentro del gesto del usuario,
 *      lo que dispara el prompt nativo de permisos
 *   3) Una vez con stream, se carga @zxing/browser (lazy) y se decodifica
 *
 * Soporta EAN-13, EAN-8, Code 128, UPC-A y QR.
 */
export function BarcodeScannerModal({ open, onClose, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [estado, setEstado] = useState<Estado>('pidiendo-permiso');
  const [error, setError] = useState<string>('');

  /** Limpia stream y controles */
  function cleanup() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // Reset al abrir/cerrar
  useEffect(() => {
    if (!open) {
      cleanup();
      setEstado('pidiendo-permiso');
      setError('');
      return;
    }

    // Validaciones tempranas
    if (typeof window !== 'undefined') {
      const isSecure = window.isSecureContext || window.location.hostname === 'localhost';
      if (!isSecure) {
        setEstado('no-seguro');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setEstado('no-soportado');
        return;
      }
    }

    return () => cleanup();
  }, [open]);

  /** Handler del botón "Activar cámara" — corre dentro del gesto del usuario */
  async function activarCamara() {
    setEstado('inicializando');
    setError('');

    try {
      // 1) Pedir cámara — esto dispara el prompt nativo si no fue pedido antes
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;

      // 2) Mostrar el stream en el <video>
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        setEstado('error');
        setError('No se pudo conectar el video');
        return;
      }
      video.srcObject = stream;
      await video.play();

      // 3) Cargar zxing diferido y empezar a decodificar
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();

      const controls = await reader.decodeFromVideoElement(video, (result) => {
        if (result) {
          const codigo = result.getText();
          beep();
          // Detener antes de notificar para evitar dobles lecturas
          cleanup();
          onDetected(codigo);
        }
      });

      controlsRef.current = controls;
      setEstado('escaneando');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const name = err instanceof Error ? err.name : '';

      if (name === 'NotAllowedError' || msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
        setEstado('sin-permiso');
      } else if (name === 'NotFoundError' || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('no se encontró')) {
        setEstado('no-soportado');
      } else {
        setEstado('error');
        setError(msg);
      }
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        // Click en el fondo cierra
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

          {/* Video — siempre montado */}
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

          {/* Estado: pidiendo-permiso (botón explícito) */}
          {estado === 'pidiendo-permiso' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Camera className="h-6 w-6 text-primary" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-medium">Acceso a la cámara</p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-[240px]">
                  Necesitamos usar la cámara para leer el código de barras.
                </p>
              </div>
              <button
                onClick={activarCamara}
                className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 active:scale-95 transition-all glow-primary"
              >
                <Camera className="h-3.5 w-3.5" strokeWidth={2.25} />
                Activar cámara
              </button>
            </div>
          )}

          {/* Estado: inicializando */}
          {estado === 'inicializando' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-xs">Iniciando cámara...</p>
            </div>
          )}

          {/* Estado: sin-permiso */}
          {estado === 'sin-permiso' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldOff className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium">Permiso denegado</p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-[260px]">
                  Para escanear, habilitá la cámara desde la configuración del navegador y volvé a entrar.
                </p>
              </div>
              <button
                onClick={activarCamara}
                className="text-[11px] text-primary underline underline-offset-4 mt-1"
              >
                Intentar de nuevo
              </button>
            </div>
          )}

          {/* Estado: no-soportado */}
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

          {/* Estado: no-seguro (HTTPS) */}
          {estado === 'no-seguro' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium">Conexión no segura</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  La cámara requiere HTTPS. Abrí el sitio con https://
                </p>
              </div>
            </div>
          )}

          {/* Estado: error */}
          {estado === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium">Error al iniciar cámara</p>
                <p className="text-[11px] text-muted-foreground mt-1 break-words max-w-[260px]">
                  {error}
                </p>
              </div>
              <button
                onClick={activarCamara}
                className="text-[11px] text-primary underline underline-offset-4 mt-1"
              >
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 text-center border-t border-border">
          <p className="text-[11px] text-muted-foreground">
            {estado === 'escaneando'
              ? 'Apuntá la cámara al código de barras'
              : estado === 'pidiendo-permiso'
              ? 'El navegador va a pedirte permiso'
              : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Beep corto con Web Audio API */
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
