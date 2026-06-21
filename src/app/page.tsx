import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Anton, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import { createClient } from '@/lib/supabase/server';
import { getDolarMep } from '@/lib/dolar';
import { LandingClient } from '@/components/landing/landing-client';

/* Tipografía de la landing — identidad de cartel / de oficio, distinta del
   UI de la app (Geist): Anton para titulares-letrero de impacto, Hanken
   Grotesk para texto/UI y JetBrains Mono para sellos y datos. Se exponen
   como CSS vars que consume landing.css. */
const display = Anton({ subsets: ['latin'], weight: '400', variable: '--gl-display', display: 'swap' });
const ui = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--gl-ui', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--gl-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Gesto — El sistema de gestión para tu negocio',
  description:
    'Punto de venta, stock, clientes, cuenta corriente y reportes para kioscos, carnicerías, servicios y más. Probalo con tu rubro, sin tarjeta.',
  openGraph: {
    title: 'Gesto — El sistema de gestión para tu negocio',
    description: 'Probá Gesto con tu rubro, sin registrarte. POS, stock, fiado y reportes para PyMEs argentinas.',
    type: 'website',
  },
};

export default async function Home() {
  // Si ya hay sesión, al dashboard; si no, mostramos la landing pública.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  let dolarMep = 1000;
  try {
    dolarMep = await getDolarMep();
  } catch {
    // fallback silencioso: la landing no debe romperse si la cotización falla
  }

  return (
    <div className={`${display.variable} ${ui.variable} ${mono.variable}`}>
      <LandingClient dolarMep={dolarMep} />
    </div>
  );
}
