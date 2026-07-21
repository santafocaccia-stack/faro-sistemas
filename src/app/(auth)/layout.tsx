import { Anton } from 'next/font/google';
import { Check } from 'lucide-react';
import { GestoLogo } from '@/components/brand/gesto-logo';

const anton = Anton({ subsets: ['latin'], weight: '400', display: 'swap' });

const BENEFICIOS = [
  'Cobrás en segundos con el escáner',
  'La cuenta corriente de cada cliente, al día',
  'Sabés cuánto vendiste, en el momento',
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ── Panel de marca (izquierda, solo desktop) ─────────────── */}
      <aside className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden border-r border-border">
        {/* Brasa */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 90% 60% at 15% -5%, oklch(0.68 0.19 38 / 0.22), transparent 60%),
              radial-gradient(ellipse 70% 50% at 110% 110%, oklch(0.68 0.19 38 / 0.10), transparent 60%),
              oklch(0.115 0.008 55)
            `,
          }}
        />
        {/* Grano */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-[0.05]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center">
          <GestoLogo markColor="#FF7518" style={{ height: 30, width: 'auto', color: '#F5F0EA' }} />
        </div>

        {/* Mensaje */}
        <div className="relative max-w-md">
          <h1 className={`${anton.className} uppercase text-5xl xl:text-6xl leading-[0.92] tracking-[0.01em]`}>
            Tu negocio,
            <br />
            ordenado.
          </h1>
          <p className="mt-6 text-base text-muted-foreground leading-relaxed max-w-sm">
            Vendé, cobrá y llevá la cuenta corriente desde un solo lugar. También desde el celular.
          </p>
          <ul className="mt-8 space-y-3.5">
            {BENEFICIOS.map((b) => (
              <li key={b} className="flex items-center gap-3 text-sm text-foreground/90">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="h-3 w-3" strokeWidth={3.2} />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Pie */}
        <p className="relative text-xs text-muted-foreground/60">Gestión comercial para PyMEs argentinas</p>
      </aside>

      {/* ── Panel del formulario (derecha) ───────────────────────── */}
      <main className="relative flex items-center justify-center p-6 min-h-screen lg:min-h-0">
        {/* Brasa sutil solo en mobile (sin el panel de marca) */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none lg:hidden"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.68 0.19 38 / 0.16), transparent 60%)',
          }}
        />
        <div className="relative w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
