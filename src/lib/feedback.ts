/**
 * Feedback sensorial para el POS — beep, vibración háptica.
 * Todo failsafe: si el browser no soporta algo, ignora silenciosamente.
 */

const STORAGE_KEY = 'gesto:pos-sonido';

/** ¿Sonido habilitado? (default: true) */
export function sonidoHabilitado(): boolean {
  if (typeof window === 'undefined') return true;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === null ? true : v === 'true';
}

export function setSonidoHabilitado(v: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, String(v));
}

/** Beep corto de confirmación — tipo POS de supermercado */
export function beep(opts?: { frecuencia?: number; duracion?: number; volumen?: number }) {
  if (typeof window === 'undefined') return;
  if (!sonidoHabilitado()) return;
  try {
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = opts?.frecuencia ?? 880;
    gain.gain.value = opts?.volumen ?? 0.18;
    osc.start();
    osc.stop(ctx.currentTime + (opts?.duracion ?? 0.08));
    setTimeout(() => ctx.close(), 250);
  } catch {
    // ignorar
  }
}

/** Vibración háptica corta — solo Android/algunos browsers */
export function vibrar(ms = 40) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(ms);
  } catch {
    // ignorar
  }
}

/** Sonido de error — tono más grave, doble pulso */
export function beepError() {
  if (!sonidoHabilitado()) return;
  beep({ frecuencia: 220, duracion: 0.12, volumen: 0.15 });
  setTimeout(() => beep({ frecuencia: 220, duracion: 0.12, volumen: 0.15 }), 130);
}
