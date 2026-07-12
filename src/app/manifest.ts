import type { MetadataRoute } from 'next';

// PWA: permite "Agregar a pantalla de inicio" en Android/iOS y abrir Gesto
// a pantalla completa como una app, sin pasar por las tiendas.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gesto — Gestión comercial',
    short_name: 'Gesto',
    description: 'Vendé, cobrá y llevá la cuenta corriente desde un solo lugar.',
    id: '/dashboard',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FAF8F5',
    theme_color: '#E85D00',
    lang: 'es-AR',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
