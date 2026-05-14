import type { NextConfig } from "next";

const securityHeaders = [
  // Evita que el browser adivine el content-type (MIME sniffing)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Prohíbe embeber la app en iframes (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Fuerza HTTPS por 1 año, incluyendo subdominios
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // No enviar Referrer a sitios externos
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deshabilita features de browser que no usamos
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
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

export default nextConfig;
