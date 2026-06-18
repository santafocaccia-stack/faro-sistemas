/**
 * Helpers de geolocalización para navegación con Google Maps.
 *
 * Problema que resuelven: una dirección como "Solis 4354, José c paz" sin
 * país es ambigua para el geocoder de Google y puede resolver a una localidad
 * homónima en otra parte del mundo. Agregando el país del negocio (derivado
 * de su zona horaria) la dirección se vuelve inequívoca.
 */

const TZ_PAIS: Record<string, string> = {
  'America/Montevideo':   'Uruguay',
  'America/Santiago':     'Chile',
  'America/Asuncion':     'Paraguay',
  'America/La_Paz':       'Bolivia',
  'America/Lima':         'Perú',
  'America/Bogota':       'Colombia',
  'America/Mexico_City':  'México',
  'America/Sao_Paulo':    'Brasil',
};

/** Deriva el país para geocoding a partir de una zona horaria IANA. */
export function paisDesdeZonaHoraria(tz: string | null | undefined): string {
  if (!tz) return 'Argentina';
  if (TZ_PAIS[tz]) return TZ_PAIS[tz]!;
  // America/Argentina/* → Argentina
  if (/^America\/Argentina\//.test(tz)) return 'Argentina';
  return 'Argentina'; // default seguro: la plataforma es argentina
}

/** Compone "direccion, localidad, país" omitiendo partes vacías. */
export function direccionCompleta(
  direccion: string,
  localidad: string | null | undefined,
  pais: string,
): string {
  return [direccion, localidad, pais].filter(Boolean).join(', ');
}

type Parada = { direccion: string; localidad?: string | null };

/** URL de Google Maps para navegar a un único destino (origen = GPS del dispositivo). */
export function mapsUrlDestino(parada: Parada, pais: string): string {
  const destino = encodeURIComponent(direccionCompleta(parada.direccion, parada.localidad, pais));
  return `https://www.google.com/maps/dir/?api=1&destination=${destino}&travelmode=driving`;
}

/**
 * URL de Google Maps con todas las paradas en orden.
 * Origen omitido → usa la ubicación actual del dispositivo.
 * destination = última parada; waypoints = todas las anteriores.
 */
export function mapsUrlRuta(paradas: Parada[], pais: string): string {
  if (paradas.length === 0) return '';
  const dirs = paradas.map((p) =>
    encodeURIComponent(direccionCompleta(p.direccion, p.localidad, pais)),
  );
  const destination = dirs[dirs.length - 1];
  const waypoints = dirs.slice(0, -1);
  const base = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
  return waypoints.length > 0 ? `${base}&waypoints=${waypoints.join('|')}` : base;
}
