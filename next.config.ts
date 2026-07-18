import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// F5 — Content Security Policy (ENFORCING desde 2026-07: mitiga XSS real).
// Validada primero en Report-Only y con QA en staging. vercel.live es el
// toolbar de previews de Vercel (solo aparece en deployments preview).
// 'unsafe-inline'/'unsafe-eval' son necesarios mientras Next no use nonces.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://api.mercadopago.com https://*.sentry.io https://*.ingest.sentry.io https://*.posthog.com https://vercel.live wss://*.pusher.com",
  "frame-src 'self' https://*.mercadopago.com https://*.mercadopago.com.ar https://vercel.live",
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
  { key: "Content-Security-Policy", value: cspDirectives },
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
