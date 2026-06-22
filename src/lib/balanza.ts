/**
 * Etiquetas de balanza con peso embebido (EAN-13 que empieza con "2").
 * Formato soportado: 2 + PLU(5 díg) + peso en gramos(5 díg) + dígito de control.
 * Devuelve el PLU (sin ceros a la izquierda) y el peso en kg, o null si el
 * código no parece una etiqueta de balanza.
 */
export function parseEtiquetaBalanza(code: string): { plu: string; kg: number } | null {
  if (!/^2\d{12}$/.test(code)) return null;
  const plu = String(parseInt(code.slice(1, 6), 10));
  const gramos = parseInt(code.slice(7, 12), 10);
  if (!gramos) return null;
  return { plu, kg: gramos / 1000 };
}
