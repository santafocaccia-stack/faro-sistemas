/**
 * Resuelve la URL pública de la app para callbacks, emails de invitación
 * y redirects de OAuth.
 *
 * Prioridad:
 *  1. NEXT_PUBLIC_APP_URL — si está seteada y NO es localhost
 *  2. VERCEL_PROJECT_PRODUCTION_URL — Vercel la inyecta automáticamente en
 *     cada deploy con el dominio de producción estable
 *  3. NEXT_PUBLIC_APP_URL aunque sea localhost (entorno de desarrollo)
 *  4. http://localhost:3000 como último recurso
 *
 * IMPORTANTE: solo para uso server-side. VERCEL_PROJECT_PRODUCTION_URL no
 * existe en el cliente (no es una variable NEXT_PUBLIC).
 */
export function getAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (explicit && !explicit.includes('localhost')) {
    return explicit;
  }

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) {
    return `https://${vercelProd}`;
  }

  return explicit || 'http://localhost:3000';
}
