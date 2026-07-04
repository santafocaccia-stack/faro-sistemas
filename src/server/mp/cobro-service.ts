/**
 * Sincronización de un cobro MP contra la API de Mercado Pago.
 *
 * Server-only. Lo usan tanto el polling (server action con sesión validada)
 * como el webhook (route sin sesión). Por seguridad NO confía en el cuerpo del
 * webhook: vuelve a pedirle a MP el pago con el token del negocio y verifica
 * que el `external_reference` coincida con el cobro.
 */
import { eq } from 'drizzle-orm';
// dbAdmin solo para el lookup inicial: el webhook no tiene sesión y ubica el
// cobro por su id (external_reference verificado contra MP más abajo). La
// escritura posterior ya corre con withTenant del tenant dueño del cobro.
import { dbAdmin, withTenant } from '@/server/db';
import { cobrosMp } from '@/server/db/schema';
import { getMPNegocioToken } from '@/server/mp/token';
import { buscarPagoPorReferencia, obtenerPago, type EstadoPagoMp } from '@/server/mp/cobro';

export type CobroEstado = 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado' | 'expirado';

function mapEstado(mpStatus: string): CobroEstado {
  if (mpStatus === 'approved') return 'aprobado';
  if (mpStatus === 'rejected') return 'rechazado';
  if (mpStatus === 'cancelled') return 'cancelado';
  return 'pendiente'; // pending | in_process | otros
}

/**
 * Consulta el estado real del cobro en MP y lo persiste si cambió a un estado
 * terminal. Idempotente: si el cobro ya estaba resuelto, devuelve lo guardado.
 *
 * @param cobroId id del cobro (== external_reference en MP)
 * @param paymentIdHint payment id que trajo el webhook (opcional, acelera)
 */
export async function sincronizarCobro(
  cobroId: string,
  paymentIdHint?: string,
): Promise<{ estado: CobroEstado; ventaId: string | null }> {
  const [cobro] = await dbAdmin
    .select()
    .from(cobrosMp)
    .where(eq(cobrosMp.id, cobroId))
    .limit(1);

  if (!cobro) return { estado: 'expirado', ventaId: null };
  if (cobro.estado !== 'pendiente') {
    return { estado: cobro.estado as CobroEstado, ventaId: cobro.ventaId };
  }

  const token = await getMPNegocioToken(cobro.tenantId);
  if (!token) return { estado: 'pendiente', ventaId: cobro.ventaId };

  // Fuente de verdad: traemos el pago desde MP (no confiamos en el webhook).
  let pago: EstadoPagoMp | null = null;
  if (paymentIdHint) pago = await obtenerPago(token, paymentIdHint);
  if (!pago) pago = await buscarPagoPorReferencia(token, cobroId);
  if (!pago) return { estado: 'pendiente', ventaId: cobro.ventaId };

  // El pago debe pertenecer a este cobro.
  if (pago.externalReference && pago.externalReference !== cobroId) {
    return { estado: 'pendiente', ventaId: cobro.ventaId };
  }

  const estado = mapEstado(pago.status);
  if (estado === 'pendiente') return { estado: 'pendiente', ventaId: cobro.ventaId };

  await withTenant(cobro.tenantId, (db) =>
    db
      .update(cobrosMp)
      .set({ estado, paymentId: pago.id, updatedAt: new Date() })
      .where(eq(cobrosMp.id, cobroId)),
  );

  return { estado, ventaId: cobro.ventaId };
}
