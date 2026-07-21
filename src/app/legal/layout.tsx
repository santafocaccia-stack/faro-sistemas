import Link from 'next/link';
import { Anton, Hanken_Grotesk } from 'next/font/google';
import { ArrowLeft } from 'lucide-react';
import { GestoLogo } from '@/components/brand/gesto-logo';
import './legal.css';

const display = Anton({ subsets: ['latin'], weight: '400', variable: '--font-legal-display', display: 'swap' });
const ui = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-legal-ui', display: 'swap' });

const LINKS = [
  { href: '/legal/terminos', label: 'Términos y Condiciones' },
  { href: '/legal/privacidad', label: 'Política de Privacidad' },
  { href: '/legal/cookies', label: 'Cookies' },
  { href: '/legal/baja-de-datos', label: 'Baja y datos' },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${display.variable} ${ui.variable} legal-root`}>
      <header className="legal-header">
        <div className="legal-header-in">
          <Link href="/" className="legal-brand">
            <GestoLogo markColor="var(--gesto-brand, #E85D00)" style={{ height: 26, width: 'auto' }} />
          </Link>
          <Link href="/" className="legal-back">
            <ArrowLeft /> Volver al inicio
          </Link>
        </div>
      </header>

      <main className="legal-container">{children}</main>

      <footer className="legal-footer">
        <div className="legal-footer-in">
          <span>© {new Date().getFullYear()} Gesto · Gestión comercial para PyMEs argentinas</span>
          <nav>
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
