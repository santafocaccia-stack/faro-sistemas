export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">

      {/* Gradiente radial principal — la brasa */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.68 0.19 38 / 0.18), transparent 60%),
            radial-gradient(ellipse 50% 40% at 100% 100%, oklch(0.55 0.13 250 / 0.10), transparent 60%),
            radial-gradient(ellipse 50% 40% at 0% 100%, oklch(0.68 0.19 38 / 0.06), transparent 60%)
          `,
        }}
      />

      {/* Grid sutil de fondo */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(to right, oklch(1 0 0) 1px, transparent 1px),
            linear-gradient(to bottom, oklch(1 0 0) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Contenido */}
      <div className="relative w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}
