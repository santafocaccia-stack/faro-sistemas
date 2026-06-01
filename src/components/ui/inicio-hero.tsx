/**
 * Hero del inicio: saludo con personalidad, teñido por el acento del plan.
 * Gradiente sutil + glow del color de la vertical (no plano/apagado).
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
    <div
      className="relative overflow-hidden rounded-2xl border border-border p-5 sm:p-6"
      style={{
        backgroundImage:
          'linear-gradient(135deg, color-mix(in oklab, var(--primary) 12%, var(--card)), var(--card) 62%)',
      }}
    >
      {/* Glow del acento */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-12 h-56 w-56 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--primary), transparent 68%)', opacity: 0.2 }}
      />
      {/* Borde-acento izquierdo */}
      <div aria-hidden className="absolute left-0 top-5 bottom-5 w-[3px] rounded-full" style={{ background: 'var(--primary)' }} />

      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary capitalize">
          {fechaLabel}
        </p>
        <h1 className="text-[26px] sm:text-[32px] font-semibold tracking-tight leading-[1.1] mt-1.5">
          {saludo}, <span className="text-primary capitalize">{nombre}</span> 👋
        </h1>
        {nota && <div className="text-sm text-muted-foreground mt-2">{nota}</div>}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}
