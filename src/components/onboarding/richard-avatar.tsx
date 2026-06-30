/**
 * Avatar de Richard — el compañero del onboarding.
 * Mascota simpática con auriculares (asistente que te acompaña), en el acento
 * del plan (var(--primary)). Sin hooks: sirve en server y client components.
 */
export function RichardAvatar({
  size = 48,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Richard"
      className={className}
    >
      <defs>
        <linearGradient id="richard-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="color-mix(in oklab, var(--primary) 88%, white)" />
          <stop offset="100%" stopColor="var(--primary)" />
        </linearGradient>
      </defs>

      {/* Auriculares: arco + almohadillas */}
      <path d="M14 33a18 18 0 0 1 36 0" stroke="var(--primary)" strokeWidth="3.5" strokeLinecap="round" opacity="0.55" />
      <rect x="9" y="30" width="7" height="13" rx="3.5" fill="var(--primary)" opacity="0.55" />
      <rect x="48" y="30" width="7" height="13" rx="3.5" fill="var(--primary)" opacity="0.55" />

      {/* Cara */}
      <rect x="16" y="20" width="32" height="30" rx="13" fill="url(#richard-face)" />

      {/* Ojos */}
      <circle cx="26" cy="34" r="3.1" fill="var(--primary-foreground)" />
      <circle cx="38" cy="34" r="3.1" fill="var(--primary-foreground)" />

      {/* Sonrisa */}
      <path d="M26 41.5c1.8 2.2 8.2 2.2 12 0" stroke="var(--primary-foreground)" strokeWidth="2.6" strokeLinecap="round" />

      {/* Micrófono del auricular */}
      <path d="M48 41v3a6 6 0 0 1-6 6h-6" stroke="var(--primary)" strokeWidth="2.4" strokeLinecap="round" opacity="0.55" fill="none" />
      <circle cx="35" cy="50" r="2" fill="var(--primary)" opacity="0.7" />
    </svg>
  );
}
