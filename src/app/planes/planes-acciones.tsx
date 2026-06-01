'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, LayoutDashboard } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/**
 * Acciones de escape en la pantalla de planes.
 * - "Volver al dashboard": solo cuando la cuenta puede usar la app.
 * - "Cerrar sesión": SIEMPRE visible (si la prueba venció o la cuenta está
 *   suspendida, es la única forma de salir o cambiar de cuenta).
 */
export function PlanesAcciones({ mostrarDashboard }: { mostrarDashboard: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function cerrarSesion() {
    start(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    });
  }

  return (
    <div className="mt-2 flex items-center gap-3">
      {mostrarDashboard && (
        <a
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Volver al dashboard
        </a>
      )}
      <button
        onClick={cerrarSesion}
        disabled={pending}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-destructive transition-colors disabled:opacity-50"
      >
        <LogOut className="h-3.5 w-3.5" />
        {pending ? 'Cerrando…' : 'Cerrar sesión'}
      </button>
    </div>
  );
}
