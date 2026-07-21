/**
 * Templates de email para el cobro de suscripción por transferencia.
 * Estilo "Brasas" (oscuro cálido), consistente con el reporte semanal.
 *
 *  - buildAvisoTransferenciaAdminHtml: al super-admin, cuando un cliente avisa.
 *  - buildPagoAvisadoClienteHtml: al cliente, acuse de "recibimos tu aviso".
 *  - buildPagoConfirmadoClienteHtml: al cliente, comprobante de pago + activación.
 *
 * NOTA: el comprobante NO es una factura fiscal AFIP (eso va por Tusfacturas);
 * es un comprobante de pago de la suscripción.
 */

import { getAppUrl } from '@/lib/app-url';

/** Escapa texto para interpolarlo seguro en el HTML del email (nombre de
 *  negocio, email, etc. son datos controlados por el usuario). */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

function formatFecha(d: Date) {
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' }).format(d);
}

/** Layout base: logo + header + contenido + footer. `subtitulo` va junto al logo. */
function layout(subtitulo: string, contenido: string, appUrl: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0d0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e8e2d9">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0d0b;padding:32px 16px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%">
        <tr><td style="padding-bottom:24px">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:40px;height:40px;background:#f97316;border-radius:10px;text-align:center;vertical-align:middle">
                <img src="${getAppUrl()}/icons/logo-email.png" width="24" height="24" alt="Gesto" style="display:inline-block;vertical-align:middle" />
              </td>
              <td style="padding-left:12px;vertical-align:middle">
                <p style="margin:0;font-size:16px;font-weight:700;color:#e8e2d9">Gesto</p>
                <p style="margin:0;font-size:12px;color:#7a6f65">${subtitulo}</p>
              </td>
            </tr>
          </table>
        </td></tr>
        ${contenido}
        <tr><td style="padding-top:16px;border-top:1px solid #2e2a25;text-align:center">
          <p style="margin:0;font-size:12px;color:#7a6f65">
            Gesto — Sistema de gestión comercial ·
            <a href="${appUrl}" style="color:#f97316;text-decoration:none">usegesto.app</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Bloque "dato" reutilizable (etiqueta + valor) dentro de una card. */
function fila(label: string, valor: string) {
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:#7a6f65">${label}</td>
    <td style="padding:6px 0;font-size:13px;text-align:right;font-weight:600;color:#e8e2d9">${valor}</td>
  </tr>`;
}

type DatosPago = {
  negocioNombre: string;
  planNombre: string;
  montoArs: number;
  appUrl: string;
};

/** Email al super-admin: un cliente avisó que transfirió → hay que confirmar. */
export function buildAvisoTransferenciaAdminHtml(d: DatosPago & { emailCliente: string }): string {
  const contenido = `
    <tr><td style="padding-bottom:20px">
      <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#e8e2d9">Nueva transferencia para confirmar</h1>
      <p style="margin:0;font-size:14px;color:#7a6f65">Un negocio avisó que ya transfirió. Verificá la plata y confirmá el pago desde el panel.</p>
    </td></tr>
    <tr><td style="padding-bottom:20px">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1714;border:1px solid #2e2a25;border-radius:12px;padding:16px">
        ${fila('Negocio', esc(d.negocioNombre))}
        ${fila('Email', esc(d.emailCliente))}
        ${fila('Plan', d.planNombre)}
        ${fila('Monto', formatARS(d.montoArs))}
      </table>
    </td></tr>
    <tr><td style="padding-bottom:24px">
      <a href="${d.appUrl}/admin/suscripciones" style="display:inline-block;background:#f97316;color:#fff;font-weight:600;font-size:14px;text-decoration:none;padding:12px 20px;border-radius:10px">Abrir panel de suscripciones →</a>
    </td></tr>`;
  return layout('Aviso de pago', contenido, d.appUrl);
}

/** Email al cliente: acuse de recibo del aviso de transferencia. */
export function buildPagoAvisadoClienteHtml(d: DatosPago): string {
  const contenido = `
    <tr><td style="padding-bottom:20px">
      <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#e8e2d9">Recibimos tu aviso ✅</h1>
      <p style="margin:0;font-size:14px;color:#7a6f65;line-height:1.6">Gracias, ${esc(d.negocioNombre)}. Estamos verificando tu transferencia. En cuanto la confirmemos te llega el comprobante y tu cuenta queda activa. Normalmente es rápido en horario hábil.</p>
    </td></tr>
    <tr><td style="padding-bottom:24px">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1714;border:1px solid #2e2a25;border-radius:12px;padding:16px">
        ${fila('Plan', d.planNombre)}
        ${fila('Monto transferido', formatARS(d.montoArs))}
        ${fila('Estado', 'Pendiente de confirmación')}
      </table>
    </td></tr>`;
  return layout('Suscripción', contenido, d.appUrl);
}

/** Email al cliente: comprobante de pago + cuenta activada hasta `vence`. */
export function buildPagoConfirmadoClienteHtml(d: DatosPago & { vence: Date; comprobanteId: string }): string {
  const contenido = `
    <tr><td style="padding-bottom:20px">
      <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#e8e2d9">¡Pago confirmado! 🎉</h1>
      <p style="margin:0;font-size:14px;color:#7a6f65;line-height:1.6">Listo, ${esc(d.negocioNombre)}. Tu cuenta quedó activa. Este es tu comprobante de pago.</p>
    </td></tr>
    <tr><td style="padding-bottom:20px">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1714;border:1px solid #2e2a25;border-radius:12px;padding:16px">
        ${fila('Comprobante', d.comprobanteId)}
        ${fila('Plan', d.planNombre)}
        ${fila('Monto', formatARS(d.montoArs))}
        ${fila('Método', 'Transferencia bancaria')}
        ${fila('Activa hasta', formatFecha(d.vence))}
      </table>
      <p style="margin:12px 2px 0;font-size:11px;color:#7a6f65;line-height:1.5">Comprobante de pago de suscripción. No válido como factura fiscal.</p>
    </td></tr>
    <tr><td style="padding-bottom:24px">
      <a href="${d.appUrl}/dashboard" style="display:inline-block;background:#f97316;color:#fff;font-weight:600;font-size:14px;text-decoration:none;padding:12px 20px;border-radius:10px">Ir a Gesto →</a>
    </td></tr>`;
  return layout('Comprobante de pago', contenido, d.appUrl);
}
