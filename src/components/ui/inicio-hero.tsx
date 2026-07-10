/**
 * Hero del inicio (rediseño "Mostrador"): banda cálida con presencia propia,
 * marca de agua "G" gigante cortada por el borde y glow del acento del plan.
 * Sirve en server y client components (sin hooks).
 */
export function InicioHero({
  saludo,
  nombre,
  fechaLabel,
  nota,
  children,
}: {
  saludo: string;
  nombre: string;
  fechaLabel: string;
  nota?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="hero-band p-5 sm:p-7">
      {/* Marca de agua decorativa */}
      <span aria-hidden className="hero-watermark hidden sm:block">G</span>

      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary capitalize">
          {fechaLabel}
        </p>
        <h1 className="text-[27px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-[1.08] mt-2">
          {saludo}, <span className="text-primary capitalize">{nombre}</span> 👋
        </h1>
        {nota && <div className="text-[14px] sm:text-[15px] text-muted-foreground mt-2.5 leading-relaxed">{nota}</div>}
        {children && <div className="mt-5 sm:max-w-sm">{children}</div>}
      </div>
    </div>
  );
}
