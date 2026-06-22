/**
 * Helpers de geolocalización para navegación con Google Maps.
 *
 * Estrategia: si el pedido tiene una "ubicación exacta" (link de Google Maps
 * que pegó el operario), intentamos extraer sus coordenadas y navegamos a ese
 * punto fijo — Google geocodea perfecto con lat,lng. Si no hay link (o no se
 * pueden extraer coords), caemos al texto de la dirección.
 *
 * Para el texto usamos el formato de PATH (/maps/dir/A/B/C) y NO el de query
 * (waypoints), porque el optimizador de waypoints desvía a calles homónimas.
 * Tampoco ensuciamos la dirección con país/provincia (mueve el geocoder).
 */

type Parada = { direccion: string; localidad?: string | null; mapsLink?: string | null };

/** Compone "direccion, localidad" omitiendo partes vacías. */
function direccionTexto(parada: Parada): string {
  return [parada.direccion, parada.localidad].filter(Boolean).join(', ');
}

/** Intenta extraer "lat,lng" de un link de Google Maps. Devuelve null si no puede. */
export function extraerCoords(link?: string | null): string | null {
  if (!link) return null;
  const patrones = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,                       // .../data=...!3dLAT!4dLNG
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,                           // /place/...@LAT,LNG,zoom
    /[?&](?:q|ll|destination|center)=(-?\d+\.\d+),(-?\d+\.\d+)/, // ?q=LAT,LNG
  ];
  for (const re of patrones) {
    const m = link.match(re);
    if (m) return `${m[1]},${m[2]}`;
  }
  return null;
}

/** Segmento de una parada para la URL de ruta: coords exactas si las hay, si no el texto. */
function segmentoParada(parada: Parada): string {
  return encodeURIComponent(extraerCoords(parada.mapsLink) ?? direccionTexto(parada));
}

/** Segmento solo-texto (para búsqueda/diagnóstico). */
function segmento(parada: Parada): string {
  return encodeURIComponent(direccionTexto(parada));
}

/** URL para navegar a un único destino (origen = GPS del dispositivo). */
export function mapsUrlDestino(parada: Parada): string {
  const coords = extraerCoords(parada.mapsLink);
  if (coords) return `https://www.google.com/maps/dir//${encodeURIComponent(coords)}`;
  // Pegó un link pero sin coords extraíbles (ej. short link): lo abrimos tal cual.
  if (parada.mapsLink && /^https?:\/\//.test(parada.mapsLink.trim())) return parada.mapsLink.trim();
  return `https://www.google.com/maps/dir//${segmento(parada)}`;
}

/** URL de BÚSQUEDA (geocoding aislado, sin ruta) — solo para diagnóstico. */
export function mapsUrlBusqueda(parada: Parada): string {
  return `https://www.google.com/maps/search/?api=1&query=${segmento(parada)}`;
}

/** Texto plano de la dirección compuesta (para diagnóstico/logs). */
export function direccionParaLog(parada: Parada): string {
  return direccionTexto(parada);
}

/**
 * URL con todas las paradas en orden (formato path). Cada parada usa sus
 * coordenadas exactas si tiene link de Maps; si no, el texto de la dirección.
 * Origen omitido (primer segmento vacío) → usa la ubicación actual.
 */
export function mapsUrlRuta(paradas: Parada[]): string {
  if (paradas.length === 0) return '';
  const segs = paradas.map(segmentoParada);
  return `https://www.google.com/maps/dir/${['', ...segs].join('/')}`;
}
