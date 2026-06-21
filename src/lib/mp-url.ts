const MP_APP_ID   = process.env.MP_APP_ID ?? '';
const APP_URL     = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gesto.app';
const REDIRECT_URI = `${APP_URL}/api/mp-oauth/callback`;

/** Arma la URL de autorización de MP. El `state` (anti-CSRF) lo genera y guarda
 *  la ruta /api/mp-oauth/start; acá solo se incrusta en la query. */
export function getUrlConectarMP(state: string): string {
  const params = new URLSearchParams({
    client_id:     MP_APP_ID,
    response_type: 'code',
    platform_id:   'mp',
    redirect_uri:  REDIRECT_URI,
    state,
  });
  return `https://auth.mercadopago.com.ar/authorization?${params}`;
}
