/**
 * Cliente Supabase para uso en el browser (componentes 'use client').
 * Singleton — se reutiliza la misma instancia en toda la app cliente.
 */
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
