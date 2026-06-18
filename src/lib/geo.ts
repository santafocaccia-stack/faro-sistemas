/**
 * Helpers de geolocalización para navegación con Google Maps.
 *
 * Decisión clave: usamos el formato de PATH (/maps/dir/A/B/C) y NO el de query
 * (?api=1&waypoints=...). En el formato query las paradas intermedias van como
 * `waypoints` y Google las pasa por su optimizador de ruta, que ante una
 * dirección ambigua elige la interpretación más cercana a la ruta — y termina
 * desviando a una calle homónima cercana. En el formato path cada parada es un
 * punto fijo y se geocodea igual que el destino final.
 *
 * Tampoco agregamos país/provincia: ensuciar la dirección con texto extra
 * llega a mover el punto que devuelve el geocoder. Se respeta exactamente lo
 * que cargó el usuario (dirección + localidad).
 */

type Parada = { direccion: string; localidad?: string | null };

/** Compone "direccion, localidad" omitiendo partes vacías. */
function direccionTexto(parada: Parada): string {
  return [parada.direccion, parada.localidad].filter(Boolean).join(', ');
}

/** Codifica una parada como segmento de path para una URL de Google Maps. */
function segmento(parada: Parada): string {
  return encodeURIComponent(direccionTexto(parada));
}

/** URL de Google Maps para navegar a un único destino (origen = GPS del dispositivo). */
export function mapsUrlDestino(parada: Parada): string {
  // El primer segmento vacío (doble slash) hace que Maps use la ubicación actual.
  return `https://www.google.com/maps/dir//${segmento(parada)}`;
}

/**
 * URL de BÚSQUEDA (geocoding aislado, sin ruta). Sirve para diagnosticar:
 * si esta variante cae bien pero la de ruta no, el problema es el formato de
 * ruta; si esta también cae mal, el problema es la dirección en sí.
 */
export function mapsUrlBusqueda(parada: Parada): string {
  return `https://www.google.com/maps/search/?api=1&query=${segmento(parada)}`;
}

/** Texto plano de la dirección compuesta (para diagnóstico/logs). */
export function direccionParaLog(parada: Parada): string {
  return direccionTexto(parada);
}

/**
 * URL de Google Maps con todas las paradas en orden, usando el formato de path.
 * Origen omitido (primer segmento vacío) → usa la ubicación actual del dispositivo.
 * Todas las paradas se tratan como puntos fijos (sin optimizador de waypoints).
 */
export function mapsUrlRuta(paradas: Parada[]): string {
  if (paradas.length === 0) return '';
  const segs = paradas.map(segmento);
  // ['', ...segs].join('/') => "/seg1/seg2"; con el "dir/" queda "dir//seg1/seg2"
  return `https://www.google.com/maps/dir/${['', ...segs].join('/')}`;
}
