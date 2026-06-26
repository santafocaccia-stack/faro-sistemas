import { getAppUrl } from '@/lib/app-url';

const MP_APP_ID = process.env.MP_APP_ID ?? '';

/** Arma la URL de autorización de MP. El `state` (anti-CSRF) lo genera y guarda
 *  la ruta /api/mp-oauth/start; acá solo se incrusta en la query.
 *
 *  El `redirect_uri` se resuelve con getAppUrl() — la MISMA fuente que usa el
 *  callback (src/app/api/mp-oauth/callback/route.ts). Si divergieran, MP
 *  rechazaría el intercambio del code por token. */
export function getUrlConectarMP(state: string): string {
  const REDIRECT_URI = `${getAppUrl()}/api/mp-oauth/callback`;
  const params = new URLSearchParams({
    client_id:     MP_APP_ID,
    response_type: 'code',
    platform_id:   'mp',
    redirect_uri:  REDIRECT_URI,
    state,
  });
  return `https://auth.mercadopago.com.ar/authorization?${params}`;
}
