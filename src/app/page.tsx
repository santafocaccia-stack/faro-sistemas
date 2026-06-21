import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDolarMep } from '@/lib/dolar';
import { LandingDemo } from '@/components/landing/landing-demo';
import { AntesDespues, Pricing, LandingFooter } from '@/components/landing/landing-sections';

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
    <main className="min-h-screen bg-background text-foreground">
      <LandingDemo />
      <AntesDespues />
      <Pricing dolarMep={dolarMep} />
      <LandingFooter />
    </main>
  );
}
