'use client';

import { useEffect, useState } from 'react';
import { Type } from 'lucide-react';

/**
 * Selector de tamaño de fuente accesible. Usa `zoom` (no font-size) porque gran
 * parte de la UI usa tamaños en px que no escalan con rem. La preferencia es
 * por dispositivo (localStorage) — tiene sentido para accesibilidad: cada quien
 * ajusta su pantalla. El valor se aplica antes del paint con un script inline en
 * el layout raíz (evita parpadeo).
 */
const OPCIONES = [
  { id: 'normal', label: 'Normal', zoom: 1,    muestra: 15 },
  { id: 'grande', label: 'Grande', zoom: 1.1,  muestra: 17 },
  { id: 'xl',     label: 'Más grande', zoom: 1.2, muestra: 19 },
  { id: 'xxl',    label: 'Máximo', zoom: 1.35, muestra: 22 },
] as const;

type OpcionId = (typeof OPCIONES)[number]['id'];
const KEY = 'gesto:font-scale';

function aplicarZoom(z: number) {
  if (typeof document !== 'undefined') {
    (document.documentElement.style as CSSStyleDeclaration & { zoom: string }).zoom = String(z);
  }
}

export function FontScaleSelector() {
  const [actual, setActual] = useState<OpcionId>('normal');

  useEffect(() => {
    const guardado = (localStorage.getItem(KEY) as OpcionId | null) ?? 'normal';
    if (OPCIONES.some((o) => o.id === guardado)) setActual(guardado);
  }, []);

  const zoomDe = (id: OpcionId) => OPCIONES.find((o) => o.id === id)!.zoom;

  function elegir(id: OpcionId) {
    setActual(id);
    localStorage.setItem(KEY, id);
    aplicarZoom(zoomDe(id));
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Type className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-tight">Tamaño de letra</h3>
      </div>
      <p className="text-[12px] text-muted-foreground mb-4">
        Agranda toda la app si te cuesta leer. Pasá el mouse para previsualizar y tocá para aplicar.
        Se guarda en este dispositivo.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {OPCIONES.map((o) => (
          <button
            key={o.id}
            type="button"
            onMouseEnter={() => aplicarZoom(o.zoom)}
            onMouseLeave={() => aplicarZoom(zoomDe(actual))}
            onFocus={() => aplicarZoom(o.zoom)}
            onBlur={() => aplicarZoom(zoomDe(actual))}
            onClick={() => elegir(o.id)}
            className={`flex flex-col items-center justify-center gap-1 h-20 rounded-lg border-2 transition-colors ${
              actual === o.id
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-background/40 text-muted-foreground hover:text-foreground hover:border-border/80'
            }`}
          >
            <span style={{ fontSize: o.muestra }} className="font-semibold leading-none">Aa</span>
            <span className="text-[11px]">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
