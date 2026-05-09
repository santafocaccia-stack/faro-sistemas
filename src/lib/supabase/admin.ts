/**
 * Cliente Supabase con Service Role — solo para Server Actions/Route Handlers.
 * NUNCA importar en código cliente ('use client').
 *
 * Requiere: SUPABASE_SECRET_KEY en env vars (service_role key de Supabase).
 * Tiene acceso completo sin restricciones de RLS.
 */
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
