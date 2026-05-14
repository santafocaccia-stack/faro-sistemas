import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // En producción captura 10% de trazas (performance). En dev, todo.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Replay: 5% de sesiones normales, 100% cuando hay error
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,      // Oculta texto en capturas (privacidad)
      blockAllMedia: true,    // Oculta imágenes en capturas
    }),
  ],

  debug: false,
});
