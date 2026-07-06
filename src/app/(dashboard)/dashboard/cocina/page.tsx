import { UtensilsCrossed } from 'lucide-react';
import Link from 'next/link';
import { requireSession } from '@/server/auth/session';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';

/**
 * Pantalla de cocina (KDS) — próximamente.
 * El ítem aparece deshabilitado en la nav ("pronto"), pero la URL directa
 * antes daba 404; esta página lo explica con la voz de la casa.
 */
export default async function CocinaPage() {
  await requireSession();

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-3xl mx-auto space-y-6 animate-fade-up">
      <PageHeader
        icon={UtensilsCrossed}
        title="Cocina (KDS)"
        subtitle="La pantalla de comandas para tu cocina"
      />
      <div className="rounded-xl border border-border/40 bg-card/40 px-6 py-10 text-center space-y-3">
        <p className="text-lg font-semibold">Muy pronto</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Estamos cocinando la pantalla de cocina: las comandas del POS van a
          aparecer acá en tiempo real para que tu equipo las prepare sin papeles.
        </p>
        <Button asChild variant="outline" className="mt-2">
          <Link href="/dashboard/ventas">Ir al punto de venta</Link>
        </Button>
      </div>
    </div>
  );
}
