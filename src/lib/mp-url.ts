const MP_APP_ID   = process.env.MP_APP_ID ?? '';
const APP_URL     = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gesto.app';
const REDIRECT_URI = `${APP_URL}/api/mp-oauth/callback`;

export function getUrlConectarMP(): string {
  const params = new URLSearchParams({
    client_id:     MP_APP_ID,
    response_type: 'code',
    platform_id:   'mp',
    redirect_uri:  REDIRECT_URI,
  });
  return `https://auth.mercadopago.com.ar/authorization?${params}`;
}
