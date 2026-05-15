import Link from 'next/link';
import { CheckCircle2, Clock } from 'lucide-react';

type Props = { searchParams: Promise<{ status?: string }> };

export default async function PlanesCallbackPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const aprobado = status === 'approved' || !status;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center space-y-4">
        {aprobado ? (
          <>
            <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
            <h1 className="text-xl font-semibold">¡Suscripción activada!</h1>
            <p className="text-sm text-muted-foreground">
              Tu cuenta está activa. Podés empezar a usar Gesto ahora mismo.
            </p>
          </>
        ) : (
          <>
            <Clock className="h-12 w-12 text-warning mx-auto" />
            <h1 className="text-xl font-semibold">Pago pendiente</h1>
            <p className="text-sm text-muted-foreground">
              Tu pago está siendo procesado. En cuanto se confirme, tu cuenta se activa automáticamente.
            </p>
          </>
        )}
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all"
        >
          Ir al dashboard
        </Link>
      </div>
    </div>
  );
}
