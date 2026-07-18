'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

/**
 * Analytics de producto (funnel de abandono). Sin NEXT_PUBLIC_POSTHOG_KEY no
 * inicializa nada — el deploy es seguro antes de crear la cuenta de Posthog.
 * Captura pageviews manualmente (App Router no dispara los automáticos).
 */
export function PosthogInit() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!KEY || posthog.__loaded) return;
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: false, // lo hacemos a mano en cada cambio de ruta
      capture_pageleave: true,
      autocapture: false, // solo pageviews + eventos explícitos: menos ruido y menos datos sensibles
      persistence: 'localStorage+cookie',
    });
  }, []);

  useEffect(() => {
    if (!KEY || !posthog.__loaded) return;
    posthog.capture('$pageview', { $current_url: window.location.href });
    // searchParams en deps: un cambio de query (ej: ?semana=1) también es navegación
  }, [pathname, searchParams]);

  return null;
}
