'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, ShieldOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Estado = 'inicializando' | 'escaneando' | 'sin-permiso' | 'no-soportado' | 'error';

type Props = {
  /** Callback con el código detectado. NO se cierra después — sigue activa. */
  onCodigo: (codigo: string) => void;
  /** Cooldown anti-doble-lectura del mismo código (ms) */
  cooldownMs?: number;
};

/**
 * Escáner de cámara continuo — se monta UNA VEZ y queda activo hasta desmontar.
 * Diseñado para el modo escaneo del POS: leer 10+ productos sin interrupciones.
 *
 * Anti-doble-lectura: el mismo código dentro de `cooldownMs` se ignora.
 * ZXing puede leer el mismo barcode 3-4 veces por segundo si la cámara
 * sigue apuntando a él.
 */
export function PosScanner({ onCodigo, cooldownMs = 1200 }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const ultimoRef = useRef<{ codigo: string; ts: number }>({ codigo: '', ts: 0 });
  const onCodigoRef = useRef(onCodigo);
  const [estado, setEstado] = useState<Estado>('inicializando');
  const [error, setError] = useState<string>('');

  // Mantener la referencia del callback fresca sin reiniciar el efecto
  useEffect(() => {
    onCodigoRef.current = onCodigo;
  }, [onCodigo]);

  useEffect(() => {
    let cancelado = false;

    async function arrancar() {
      // Validaciones tempranas
      const isSecure = window.isSecureContext || window.location.hostname === 'localhost';
      if (!isSecure) { setEstado('no-soportado'); setError('Requiere HTTPS'); return; }
      if (!navigator.mediaDevices?.getUserMedia) { setEstado('no-soportado'); return; }

      try {
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
        if (!video) { stream.getTracks().forEach((t) => t.stop()); return; }
        video.srcObject = stream;
        await video.play();

        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        if (cancelado) return;
        const reader = new BrowserMultiFormatReader();

        const controls = await reader.decodeFromVideoElement(video, (result) => {
          if (!result || cancelado) return;
          const codigo = result.getText();
          const ahora = Date.now();
          // Anti-doble-lectura del mismo código
          if (codigo === ultimoRef.current.codigo && ahora - ultimoRef.current.ts < cooldownMs) {
            return;
          }
          ultimoRef.current = { codigo, ts: ahora };
          onCodigoRef.current(codigo);
        });

        if (cancelado) { controls.stop(); return; }
        controlsRef.current = controls;
        setEstado('escaneando');
      } catch (err) {
        if (cancelado) return;
        const msg = err instanceof Error ? err.message : String(err);
        const name = err instanceof Error ? err.name : '';
        if (name === 'NotAllowedError' || msg.toLowerCase().includes('permission')) {
          setEstado('sin-permiso');
        } else if (name === 'NotFoundError') {
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
      controlsRef.current?.stop();
      controlsRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [cooldownMs]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Video — fondo */}
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

      {/* Mira de escaneo */}
      {estado === 'escaneando' && (
        <>
          {/* Dimming alrededor — capa con clip-path */}
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-[78%] h-[55%] max-w-md">
              {/* Esquinas */}
              <div className="absolute top-0 left-0 h-7 w-7 border-t-[3px] border-l-[3px] border-primary rounded-tl-lg" />
              <div className="absolute top-0 right-0 h-7 w-7 border-t-[3px] border-r-[3px] border-primary rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 h-7 w-7 border-b-[3px] border-l-[3px] border-primary rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 h-7 w-7 border-b-[3px] border-r-[3px] border-primary rounded-br-lg" />
              {/* Línea de scan animada */}
              <div className="absolute inset-x-2 top-1/2 h-0.5 bg-primary shadow-[0_0_12px_oklch(0.68_0.19_43_/_0.8)] animate-scan-line" />
              {/* Hueco transparente sobre el dimming — usamos box-shadow inset masivo */}
              <div
                aria-hidden
                className="absolute inset-0 rounded-lg"
                style={{ boxShadow: '0 0 0 9999px oklch(0 0 0 / 0.4)' }}
              />
            </div>
          </div>

          {/* Hint inferior */}
          <div className="absolute bottom-3 inset-x-0 text-center pointer-events-none">
            <p className="text-[11px] text-white/80 font-medium drop-shadow">
              Apuntá al código de barras
            </p>
          </div>
        </>
      )}

      {/* Estado: inicializando */}
      {estado === 'inicializando' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-xs">Activando cámara...</p>
        </div>
      )}

      {/* Estado: sin permiso */}
      {estado === 'sin-permiso' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="h-10 w-10 rounded-full bg-destructive/15 flex items-center justify-center">
            <ShieldOff className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Cámara bloqueada</p>
            <p className="text-[11px] text-white/60 mt-1 max-w-[280px]">
              Tocá el candado de la URL → Permisos → Cámara → Permitir
            </p>
          </div>
        </div>
      )}

      {/* Estado: no soportado */}
      {estado === 'no-soportado' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="h-10 w-10 rounded-full bg-warning/15 flex items-center justify-center">
            <Camera className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Sin cámara disponible</p>
            <p className="text-[11px] text-white/60 mt-1">{error || 'Tu dispositivo no soporta cámara web'}</p>
          </div>
        </div>
      )}

      {/* Estado: error */}
      {estado === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="h-10 w-10 rounded-full bg-destructive/15 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Error de cámara</p>
            <p className="text-[11px] text-white/60 mt-1 break-words max-w-[260px]">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
