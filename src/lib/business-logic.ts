/**
 * Lógica de negocio pura — sin dependencias de DB ni framework.
 * Módulo 100% testeable con Vitest sin mocks.
 */

export type LineaSimple = { subtotal: string | number };

/**
 * Calcula subtotal, descuento y total de una venta a partir de sus líneas.
 */
export function calcularTotalesVenta(
  lineas: LineaSimple[],
  descuento: number,
): { subtotal: number; descuento: number; total: number } {
  const subtotal = lineas.reduce((acc, l) => acc + Number(l.subtotal), 0);
  const total = subtotal - descuento;
  return { subtotal, descuento, total };
}

/**
 * Valida que una venta en cuenta corriente no exceda el límite de crédito.
 * limiteCredito = 0 significa "sin límite" → nunca lanza.
 */
export function validarLimiteCredito(
  saldoActual: number,
  montoVenta: number,
  limiteCredito: number,
): void {
  if (limiteCredito <= 0) return;
  const saldoPosterior = saldoActual + montoVenta;
  if (saldoPosterior > limiteCredito) {
    throw new Error(
      `Límite de crédito excedido. ` +
      `Límite: $${limiteCredito.toLocaleString('es-AR')} — ` +
      `Saldo actual: $${saldoActual.toLocaleString('es-AR')} — ` +
      `Esta venta sumaría: $${montoVenta.toLocaleString('es-AR')}`,
    );
  }
}

/**
 * Calcula el saldo nuevo de un cliente al registrar un pago.
 * Puede quedar negativo (crédito a favor del cliente).
 */
export function calcularSaldoPostPago(saldoActual: number, montoPago: number): number {
  return saldoActual - montoPago;
}

/**
 * Calcula el saldo nuevo de un cliente al cargar una venta en CC.
 */
export function calcularSaldoPostVenta(saldoActual: number, totalVenta: number): number {
  return saldoActual + totalVenta;
}
