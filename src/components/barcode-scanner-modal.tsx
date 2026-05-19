'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertCircle, Loader2, ShieldOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  onDetected: (codigo: string) => void;
};

type Estado =
  | 'inicializando'
  | 'escaneando'
  | 'sin-permiso'
  | 'no-soportado'
  | 'no-seguro'
  | 'error';

type Browser =
  | 'chrome-android'
  | 'chrome-desktop'
  | 'safari-ios'
  | 'safari-mac'
  | 'firefox'
  | 'edge'
  | 'desconocido';

/**
 * Detecta el browser para mostrar instrucciones específicas si la cámara
 * fue bloqueada (cada browser tiene un flujo distinto para resetear permisos).
 */
function detectarBrowser(): Browser {
  if (typeof navigator === 'undefined') return 'desconocido';
  const ua = navigator.userAgent.toLowerCase();
  const isAndroid = ua.includes('android');
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isMac = ua.includes('macintosh') && !isIOS;

  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('firefox/')) return 'firefox';
  if (ua.includes('chrome/') && !ua.includes('edg/')) {
    return isAndroid ? 'chrome-android' : 'chrome-desktop';
  }
  if (ua.includes('safari/') && !ua.includes('chrome/')) {
    if (isIOS) return 'safari-ios';
    if (isMac) return 'safari-mac';
  }
  return 'desconocido';
}

function instruccionesDesbloqueo(browser: Browser): { titulo: string; pasos: string[] } {
  switch (browser) {
    case 'chrome-android':
      return {
        titulo: 'Chrome Android',
        pasos: [
          'Tocá el candado 🔒 a la izquierda de la URL',
          'Tocá "Permisos" o "Configuración del sitio"',
          'Cámara → cambiar a "Preguntar" o "Permitir"',
          'Volvé a tocar el botón de escanear',
        ],
      };
    case 'safari-ios':
      return {
        titulo: 'Safari iOS',
        pasos: [
          'Abrí Configuración del iPhone',
          'Bajá a Safari → Cámara',
          'Cambiá a "Preguntar" o "Permitir"',
          'Volvé al sitio y recargá la página',
        ],
      };
    case 'chrome-desktop':
    case 'edge':
      return {
        titulo: browser === 'edge' ? 'Edge' : 'Chrome',
        pasos: [
          'Tocá el candado 🔒 a la izquierda de la URL',
          'Buscá "Cámara" y cambialo a "Permitir"',
          'Recargá la página',
        ],
      };
    case 'safari-mac':
      return {
        titulo: 'Safari Mac',
        pasos: [
          'En la barra del menú: Safari → Configuración',
          'Pestaña "Sitios web" → Cámara',
          'Buscá el sitio y cambialo a "Permitir"',
          'Recargá la página',
        ],
      };
    case 'firefox':
      return {
        titulo: 'Firefox',
        pasos: [
          'Tocá el candado 🔒 a la izquierda de la URL',
          'Tocá la "X" al lado de "Bloqueada temporalmente"',
          'Recargá la página y aceptá el prompt',
        ],
      };
    default:
      return {
        titulo: 'Tu navegador',
        pasos: [
          'Buscá la configuración de permisos del sitio',
          'Habilitá el acceso a la cámara',
          'Recargá la página',
        ],
      };
  }
}

export function BarcodeScannerModal({ open, onClose, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [estado, setEstado] = useState<Estado>('inicializando');
  const [error, setError] = useState<string>('');
  const [browser, setBrowser] = useState<Browser>('desconocido');
  const [intento, setIntento] = useState(0);

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
      setIntento(0);
      return;
    }

    setBrowser(detectarBrowser());
    let cancelado = false;

    async function arrancar() {
      // 1) Validar contexto seguro (HTTPS)
      const isSecure = window.isSecureContext || window.location.hostname === 'localhost';
      if (!isSecure) { setEstado('no-seguro'); return; }
      if (!navigator.mediaDevices?.getUserMedia) { setEstado('no-soportado'); return; }

      // No chequeamos Permissions API previamente porque en algunos browsers
      // da falsos positivos (reporta 'denied' aunque el sitio no esté bloqueado
      // explícitamente). Vamos directo a getUserMedia y manejamos el error.

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
        if (!video) {
          stream.getTracks().forEach((t) => t.stop());
          setEstado('error');
          setError('No se pudo conectar el video');
          return;
        }
        video.srcObject = stream;
        await video.play();

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
    return () => { cancelado = true; cleanup(); };
  }, [open, onDetected, intento]);

  function reintentar() {
    setEstado('inicializando');
    setError('');
    setIntento((n) => n + 1);
  }

  if (!open) return null;

  const instr = instruccionesDesbloqueo(browser);

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
        <div className={cn(
          'relative bg-black overflow-hidden',
          estado === 'sin-permiso' ? 'min-h-[420px]' : 'aspect-[4/3]',
        )}>

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
              <p className="text-xs">Esperando permiso de cámara...</p>
              <p className="text-[10px] text-muted-foreground/60 max-w-[260px] text-center px-6">
                Si no aparece el prompt, revisá la barra de URL o aceptá el permiso.
              </p>
            </div>
          )}

          {/* Sin permiso — pantalla detallada con instrucciones */}
          {estado === 'sin-permiso' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-5 py-6 text-center overflow-y-auto">
              <div className="h-12 w-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
                <ShieldOff className="h-5 w-5 text-destructive" />
              </div>

              <div className="max-w-[300px]">
                <p className="text-sm font-semibold">Cámara bloqueada</p>
                <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                  Para escanear, necesitás habilitar la cámara en {instr.titulo}.
                </p>
              </div>

              <div className="w-full max-w-[300px] bg-muted/30 border border-border/40 rounded-lg p-3 text-left">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
                  Pasos:
                </p>
                <ol className="space-y-1.5">
                  {instr.pasos.map((paso, i) => (
                    <li key={i} className="flex gap-2 text-[11px] text-foreground/80 leading-snug">
                      <span className="shrink-0 h-4 w-4 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span>{paso}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <button
                onClick={reintentar}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[12px] font-medium bg-primary text-primary-foreground hover:brightness-110 active:scale-95 transition-all"
              >
                <RefreshCw className="h-3 w-3" />
                Ya lo habilité, probar de nuevo
              </button>
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
              <button
                onClick={reintentar}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[12px] font-medium bg-muted text-foreground hover:bg-muted/70 transition-all"
              >
                <RefreshCw className="h-3 w-3" />
                Reintentar
              </button>
            </div>
          )}
        </div>

        <div className="px-4 py-3 text-center border-t border-border">
          <p className="text-[11px] text-muted-foreground">
            {estado === 'escaneando'
              ? 'Apuntá la cámara al código de barras'
              : estado === 'sin-permiso'
              ? 'El permiso se guarda — solo lo hacés una vez'
              : 'Aceptá el permiso para continuar'}
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
