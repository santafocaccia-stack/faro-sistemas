'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, LayoutDashboard } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/**
 * Acciones de escape en la pantalla de planes — barra superior, siempre
 * visibles (no hay que scrollear los planes para encontrarlas en mobile).
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

  const chip =
    'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border text-xs font-medium transition-colors';

  return (
    <div className="flex items-center gap-2">
      {mostrarDashboard && (
        <a
          href="/dashboard"
          className={`${chip} border-border bg-card/60 text-muted-foreground hover:text-foreground hover:bg-card`}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Volver al</span> Dashboard
        </a>
      )}
      <button
        onClick={cerrarSesion}
        disabled={pending}
        className={`${chip} border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 disabled:opacity-50`}
      >
        <LogOut className="h-3.5 w-3.5" />
        {pending ? 'Cerrando…' : 'Cerrar sesión'}
      </button>
    </div>
  );
}
