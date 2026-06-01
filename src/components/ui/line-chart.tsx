'use client';

import { useId, useMemo, useState } from 'react';

export type SeriePunto = { label: string; valor: number };

/**
 * Gráfico de líneas (no de velas) liviano en SVG — sin dependencias.
 * - Serie principal con relleno degradado del color del plan (--primary).
 * - Serie de comparación opcional (período anterior) en línea tenue punteada.
 * - Hover para ver el valor de cada punto.
 * Responsive: usa viewBox y escala al ancho del contenedor.
 */
export function LineChart({
  serie,
  comparacion,
  formato = (n) => n.toLocaleString('es-AR'),
  alto = 200,
}: {
  serie: SeriePunto[];
  comparacion?: SeriePunto[];
  formato?: (n: number) => string;
  alto?: number;
}) {
  const id = useId().replace(/:/g, '');
  const [hover, setHover] = useState<number | null>(null);

  const W = 760;
  const H = alto;
  const padX = 12;
  const padTop = 16;
  const padBottom = 26;

  const n = serie.length;
  const todos = [...serie.map((s) => s.valor), ...(comparacion?.map((s) => s.valor) ?? [])];
  const max = Math.max(...todos, 1);
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;

  const x = (i: number) => padX + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => padTop + innerH - (v / max) * innerH;

  const linePath = (pts: SeriePunto[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.valor).toFixed(1)}`).join(' ');

  const areaPath = useMemo(() => {
    if (n === 0) return '';
    const top = serie.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.valor).toFixed(1)}`).join(' ');
    return `${top} L ${x(n - 1).toFixed(1)} ${(padTop + innerH).toFixed(1)} L ${x(0).toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serie, max, n]);

  // Etiquetas X: mostramos ~6 espaciadas para no saturar
  const paso = Math.max(1, Math.ceil(n / 6));

  if (n === 0) {
    return <p className="text-xs text-muted-foreground text-center py-12">Sin datos en el período</p>;
  }

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: alto }}
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grilla horizontal sutil */}
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1={padX} x2={W - padX}
            y1={padTop + innerH * g} y2={padTop + innerH * g}
            stroke="var(--border)" strokeWidth="1"
          />
        ))}

        {/* Comparación (período anterior) */}
        {comparacion && comparacion.length === n && (
          <path
            d={linePath(comparacion)}
            fill="none"
            stroke="var(--muted-foreground)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.5"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Área + línea principal */}
        <path d={areaPath} fill={`url(#fill-${id})`} />
        <path
          d={linePath(serie)}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Puntos + hover */}
        {serie.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.valor)} r={hover === i ? 4 : 2.5} fill="var(--primary)" />
            {/* zona de hover invisible */}
            <rect
              x={x(i) - innerW / (n * 2)} y={0}
              width={innerW / Math.max(n, 1)} height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}

        {/* Etiquetas X */}
        {serie.map((p, i) =>
          i % paso === 0 || i === n - 1 ? (
            <text
              key={i}
              x={x(i)} y={H - 8}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 10 }}
            >
              {p.label}
            </text>
          ) : null,
        )}
      </svg>

      {/* Tooltip / lectura del punto */}
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {hover !== null ? serie[hover]!.label : `${serie[0]!.label} – ${serie[n - 1]!.label}`}
        </span>
        <span className="font-mono tabular-nums font-semibold">
          {formato(hover !== null ? serie[hover]!.valor : serie.reduce((a, s) => a + s.valor, 0))}
          {hover === null && <span className="text-muted-foreground font-normal ml-1">total</span>}
        </span>
      </div>
    </div>
  );
}
