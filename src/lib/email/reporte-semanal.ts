/**
 * Template HTML para el reporte semanal por email.
 * Se envía cada lunes al dueño con los KPIs de la semana anterior.
 */

type TopProducto = { nombre: string | null; totalMonto: number; totalCantidad: number };
type PorMetodo   = { metodo: string; total: number };

export type DatosReporteSemanal = {
  negocioNombre: string;
  ventasTotales: number;
  cantidadVentas: number;
  ticketPromedio: number;
  topProductos: TopProducto[];
  porMetodo: PorMetodo[];
  semanaLabel: string; // "lunes 19 al domingo 25 de mayo" (o el día, en el reporte diario)
  // Labels opcionales para reusar el template en el reporte diario
  subtitulo?: string;   // header chico — default "Reporte semanal"
  titulo?: string;      // título grande — default "Resumen de la semana"
  footerNota?: string;  // pie — default "...cada lunes"
};

const METODO_LABELS: Record<string, string> = {
  efectivo:        'Efectivo',
  transferencia:   'Transferencia',
  tarjeta_debito:  'Débito',
  tarjeta_credito: 'Crédito',
  mercado_pago:    'Mercado Pago',
  cuenta_corriente:'Cta. Cte.',
};

/** Escapa texto controlado por el usuario (nombre de negocio, de productos)
 *  antes de interpolarlo en el HTML del email. */
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

export function buildReporteSemanalHtml(datos: DatosReporteSemanal): string {
  const { negocioNombre, ventasTotales, cantidadVentas, ticketPromedio, topProductos, porMetodo, semanaLabel } = datos;
  const subtitulo  = datos.subtitulo  ?? 'Reporte semanal';
  const titulo     = datos.titulo     ?? 'Resumen de la semana';
  const footerNota = datos.footerNota ?? 'Este email se envía automáticamente cada lunes';

  const topRows = topProductos.slice(0, 5).map((p, i) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #2e2a25;color:#7a6f65;font-size:13px">${i + 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #2e2a25;font-size:13px">${esc(p.nombre ?? 'Producto sin nombre')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #2e2a25;text-align:right;font-family:monospace;font-size:13px">${formatARS(p.totalMonto)}</td>
    </tr>
  `).join('');

  const metodoRows = porMetodo.slice(0, 5).map((m) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #2e2a25;font-size:13px">${METODO_LABELS[m.metodo] ?? m.metodo}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #2e2a25;text-align:right;font-family:monospace;font-size:13px">${formatARS(m.total)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0d0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e8e2d9">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0d0b;padding:32px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

        <!-- Logo + header -->
        <tr><td style="padding-bottom:24px">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:40px;height:40px;background:#f97316;border-radius:10px;text-align:center;vertical-align:middle">
                <span style="font-weight:900;font-size:18px;color:#fff;line-height:40px">G</span>
              </td>
              <td style="padding-left:12px;vertical-align:middle">
                <p style="margin:0;font-size:16px;font-weight:700;color:#e8e2d9">Gesto</p>
                <p style="margin:0;font-size:12px;color:#7a6f65">${subtitulo}</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Título -->
        <tr><td style="padding-bottom:24px">
          <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#e8e2d9">${titulo}</h1>
          <p style="margin:0;font-size:14px;color:#7a6f65">${esc(negocioNombre)} · ${semanaLabel}</p>
        </td></tr>

        <!-- KPIs -->
        <tr><td style="padding-bottom:24px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="33%" style="padding:16px;background:#1a1714;border:1px solid #2e2a25;border-radius:12px;text-align:center">
                <p style="margin:0 0 4px;font-size:11px;color:#7a6f65;text-transform:uppercase;letter-spacing:.08em">Ventas totales</p>
                <p style="margin:0;font-size:22px;font-weight:700;font-family:monospace;color:#f97316">${formatARS(ventasTotales)}</p>
              </td>
              <td width="4%"></td>
              <td width="30%" style="padding:16px;background:#1a1714;border:1px solid #2e2a25;border-radius:12px;text-align:center">
                <p style="margin:0 0 4px;font-size:11px;color:#7a6f65;text-transform:uppercase;letter-spacing:.08em">Transacciones</p>
                <p style="margin:0;font-size:22px;font-weight:700;color:#e8e2d9">${cantidadVentas}</p>
              </td>
              <td width="4%"></td>
              <td width="29%" style="padding:16px;background:#1a1714;border:1px solid #2e2a25;border-radius:12px;text-align:center">
                <p style="margin:0 0 4px;font-size:11px;color:#7a6f65;text-transform:uppercase;letter-spacing:.08em">Ticket promedio</p>
                <p style="margin:0;font-size:22px;font-weight:700;font-family:monospace;color:#e8e2d9">${formatARS(ticketPromedio)}</p>
              </td>
            </tr>
          </table>
        </td></tr>

        ${topProductos.length > 0 ? `
        <!-- Top productos -->
        <tr><td style="padding-bottom:24px">
          <p style="margin:0 0 12px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#7a6f65">Top productos</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1714;border:1px solid #2e2a25;border-radius:12px;overflow:hidden">
            <tr style="background:#231f1b">
              <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#7a6f65;font-weight:500">#</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#7a6f65;font-weight:500">Producto</th>
              <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#7a6f65;font-weight:500">Total</th>
            </tr>
            ${topRows}
          </table>
        </td></tr>
        ` : ''}

        ${porMetodo.length > 0 ? `
        <!-- Por método de pago -->
        <tr><td style="padding-bottom:32px">
          <p style="margin:0 0 12px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#7a6f65">Métodos de pago</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1714;border:1px solid #2e2a25;border-radius:12px;overflow:hidden">
            <tr style="background:#231f1b">
              <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#7a6f65;font-weight:500">Método</th>
              <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#7a6f65;font-weight:500">Total</th>
            </tr>
            ${metodoRows}
          </table>
        </td></tr>
        ` : ''}

        <!-- Footer -->
        <tr><td style="padding-top:16px;border-top:1px solid #2e2a25;text-align:center">
          <p style="margin:0;font-size:12px;color:#7a6f65">
            ${footerNota} ·
            <a href="{{APP_URL}}/dashboard" style="color:#f97316;text-decoration:none">Ir al dashboard →</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Genera el label legible de la semana: "lunes 19 al domingo 25 de mayo" */
export function semanaLabel(desde: Date, hasta: Date): string {
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const d = dias[desde.getDay()]!;
  const h = dias[hasta.getDay()]!;
  const mes = meses[hasta.getMonth()]!;
  return `${d} ${desde.getDate()} al ${h} ${hasta.getDate()} de ${mes}`;
}
