import { updateSession } from '@/lib/supabase/middleware';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Excluye /api: cada route handler aplica su propio control de acceso
    // (webhook MP con firma, cron con CRON_SECRET, PDF con requireSession,
    // oauth callback con su flujo). Sin esta exclusión, updateSession
    // redirige los requests sin sesión a /login y rompe el webhook de
    // Mercado Pago (las suscripciones no se activan) y el cron semanal.
    // manifest.webmanifest: el navegador lo pide sin cookies de sesión al
    // instalar la PWA; si updateSession lo redirige a /login, la app deja
    // de ser instalable.
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
