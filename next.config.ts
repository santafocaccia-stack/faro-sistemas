import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// F5 — Content Security Policy.
// Arranca en modo Report-Only: NO bloquea, solo registra violaciones en la
// consola del navegador. Permite validar en un preview de Vercel que ninguna
// dependencia legítima (Supabase, Mercado Pago, Sentry, scanner ZXing) se
// rompe. Una vez confirmado sin violaciones, cambiar la key a
// "Content-Security-Policy" (enforcing) para que efectivamente mitigue XSS.
// 'unsafe-inline'/'unsafe-eval' son necesarios mientras Next no use nonces.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://api.mercadopago.com https://*.sentry.io https://*.ingest.sentry.io",
  "frame-src 'self' https://*.mercadopago.com https://*.mercadopago.com.ar",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // camera=(self): permitido solo en el mismo origen (necesario para el scanner)
    // microphone=(): bloqueado completamente
    // geolocation=(): bloqueado completamente
    // interest-cohort=(): bloquea FLoC (privacidad)
    value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Report-Only por ahora — cambiar a "Content-Security-Policy" tras validar en preview.
  { key: "Content-Security-Policy-Report-Only", value: cspDirectives },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Sube source maps solo si SENTRY_AUTH_TOKEN está configurado
  silent: !process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Oculta source maps del bundle final (no se sirven al cliente)
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },

  // Reduce logs de Sentry durante el build
  disableLogger: true,

  // Monitoreo automático de deploys en Vercel
  automaticVercelMonitors: true,
});
