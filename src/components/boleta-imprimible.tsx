'use client';

import { formatARS } from '@/lib/utils';

const METODO_LABEL: Record<string, string> = {
  efectivo:        'Efectivo',
  transferencia:   'Transferencia',
  tarjeta_debito:  'Tarjeta débito',
  tarjeta_credito: 'Tarjeta crédito',
  mercado_pago:    'Mercado Pago',
  cheque:          'Cheque',
  otro:            'Otro',
};

type Linea = {
  id: string;
  descripcion: string;
  cantidad: string | number;
  precioUnitario: string | number;
  subtotal: string | number;
};

type Props = {
  numero: number;
  fecha: Date | string;
  canal: 'minorista' | 'mayorista';
  estado: string;
  clienteNombre: string | null;
  tipoPago: string;
  metodoPago?: string | null;
  subtotalVenta: string | number;
  descuento: string | number;
  total: string | number;
  montoPagado?: string | number;
  notas?: string | null;
  lineas: Linea[];
  // Datos del negocio
  negocioNombre: string;
  negocioCuit?: string | null;
  negocioDireccion?: string | null;
  negocioTelefono?: string | null;
};

export function BoletaImprimible({
  numero, fecha, canal, clienteNombre,
  tipoPago, metodoPago, subtotalVenta, descuento, total, montoPagado, notas,
  lineas, negocioNombre, negocioCuit, negocioDireccion, negocioTelefono,
}: Props) {
  const fechaObj = new Date(fecha);
  const fechaStr = fechaObj.toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });
  const horaStr = fechaObj.toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="print-only hidden">
      {canal === 'minorista'
        ? <TicketMinorista {...{ numero, fechaStr, horaStr, clienteNombre, tipoPago, metodoPago, subtotalVenta, descuento, total, lineas, negocioNombre, negocioCuit, negocioDireccion, negocioTelefono }} />
        : <RemitoMayorista {...{ numero, fechaStr, horaStr, clienteNombre, tipoPago, metodoPago, subtotalVenta, descuento, total, montoPagado, notas, lineas, negocioNombre, negocioCuit, negocioDireccion, negocioTelefono }} />
      }
    </div>
  );
}

/* ══════════════════════════════════════════════
   TICKET MINORISTA — estilo papel térmico 80mm
══════════════════════════════════════════════ */
function TicketMinorista({
  numero, fechaStr, horaStr, clienteNombre,
  metodoPago, subtotalVenta, descuento, total,
  lineas, negocioNombre, negocioCuit, negocioDireccion, negocioTelefono,
}: {
  numero: number;
  fechaStr: string;
  horaStr: string;
  clienteNombre: string | null;
  tipoPago: string;
  metodoPago?: string | null;
  subtotalVenta: string | number;
  descuento: string | number;
  total: string | number;
  lineas: Linea[];
  negocioNombre: string;
  negocioCuit?: string | null;
  negocioDireccion?: string | null;
  negocioTelefono?: string | null;
}) {
  return (
    <div
      style={{
        fontFamily: 'monospace, "Courier New"',
        fontSize: '11px',
        lineHeight: '1.4',
        color: '#000',
        background: '#fff',
        width: '72mm',
        padding: '4mm',
        margin: '0 auto',
      }}
    >
      {/* Cabecera */}
      <div style={{ textAlign: 'center', marginBottom: '4mm' }}>
        <div style={{ fontSize: '15px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
          {negocioNombre.toUpperCase()}
        </div>
        {negocioCuit && (
          <div style={{ fontSize: '10px', marginTop: '1mm' }}>CUIT: {negocioCuit}</div>
        )}
        {negocioDireccion && (
          <div style={{ fontSize: '10px', marginTop: '1mm' }}>{negocioDireccion}</div>
        )}
        {negocioTelefono && (
          <div style={{ fontSize: '10px', marginTop: '0.5mm' }}>Tel: {negocioTelefono}</div>
        )}
      </div>

      <Separador />

      {/* Número y fecha */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3mm' }}>
        <span>Ticket #{String(numero).padStart(4, '0')}</span>
        <span>{fechaStr} {horaStr}hs</span>
      </div>

      {clienteNombre && (
        <div style={{ marginBottom: '2mm' }}>
          <span style={{ color: '#555' }}>Cliente: </span>{clienteNombre}
        </div>
      )}

      <Separador />

      {/* Items */}
      <div style={{ marginBottom: '3mm' }}>
        {lineas.map((l) => {
          const cant = Number(l.cantidad);
          const pu = Number(l.precioUnitario);
          const sub = Number(l.subtotal);
          return (
            <div key={l.id} style={{ marginBottom: '2mm' }}>
              <div style={{ fontWeight: 'bold' }}>{l.descripcion}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '3mm' }}>
                <span>
                  {cant % 1 === 0 ? cant : cant.toFixed(3)} ×{' '}
                  {formatARS(pu)}
                </span>
                <span style={{ fontWeight: 'bold' }}>{formatARS(sub)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <Separador char="─" />

      {/* Totales */}
      {Number(descuento) > 0 && (
        <FilaTotal label="Subtotal" valor={formatARS(Number(subtotalVenta))} />
      )}
      {Number(descuento) > 0 && (
        <FilaTotal label="Descuento" valor={`− ${formatARS(Number(descuento))}`} />
      )}
      <FilaTotal
        label="TOTAL"
        valor={formatARS(Number(total))}
        grande
      />

      <Separador char="─" />

      {/* Método */}
      {metodoPago && (
        <div style={{ margin: '2mm 0', textAlign: 'center' }}>
          {METODO_LABEL[metodoPago] ?? metodoPago}
        </div>
      )}

      <Separador />

      {/* Pie */}
      <div style={{ textAlign: 'center', marginTop: '3mm', fontSize: '10px', color: '#555' }}>
        <div>¡Gracias por su compra!</div>
        <div style={{ marginTop: '1mm' }}>Gesto</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   REMITO MAYORISTA — estilo A4 formal
══════════════════════════════════════════════ */
function RemitoMayorista({
  numero, fechaStr, horaStr, clienteNombre,
  tipoPago, metodoPago, subtotalVenta, descuento, total, montoPagado, notas,
  lineas, negocioNombre, negocioCuit, negocioDireccion, negocioTelefono,
}: {
  numero: number;
  fechaStr: string;
  horaStr: string;
  clienteNombre: string | null;
  tipoPago: string;
  metodoPago?: string | null;
  subtotalVenta: string | number;
  descuento: string | number;
  total: string | number;
  montoPagado?: string | number;
  notas?: string | null;
  lineas: Linea[];
  negocioNombre: string;
  negocioCuit?: string | null;
  negocioDireccion?: string | null;
  negocioTelefono?: string | null;
}) {
  return (
    <div
      style={{
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        fontSize: '12px',
        lineHeight: '1.5',
        color: '#111',
        background: '#fff',
        padding: '0',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8mm', borderBottom: '2px solid #111', paddingBottom: '4mm' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            {negocioNombre}
          </div>
          {negocioCuit && (
            <div style={{ fontSize: '11px', color: '#555', marginTop: '1mm' }}>
              CUIT: {negocioCuit}
            </div>
          )}
          {negocioDireccion && (
            <div style={{ fontSize: '11px', color: '#555', marginTop: '0.5mm' }}>
              {negocioDireccion}
            </div>
          )}
          {negocioTelefono && (
            <div style={{ fontSize: '11px', color: '#555', marginTop: '0.5mm' }}>
              Tel: {negocioTelefono}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18px', fontWeight: '700' }}>REMITO</div>
          <div style={{ fontSize: '13px', fontWeight: '600' }}>N° {String(numero).padStart(6, '0')}</div>
          <div style={{ fontSize: '11px', color: '#555', marginTop: '1mm' }}>
            {fechaStr} — {horaStr}hs
          </div>
        </div>
      </div>

      {/* Datos del destinatario */}
      <div style={{ marginBottom: '6mm', padding: '3mm 4mm', border: '1px solid #e5e7eb', borderRadius: '4px', background: '#f9fafb' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: '1mm' }}>
          Destinatario
        </div>
        <div style={{ fontWeight: '600', fontSize: '13px' }}>{clienteNombre ?? 'Consumidor Final'}</div>
      </div>

      {/* Tabla de items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6mm' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #111' }}>
            <th style={{ textAlign: 'left', padding: '2mm 2mm', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Descripción</th>
            <th style={{ textAlign: 'right', padding: '2mm 2mm', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', width: '16mm' }}>Cant.</th>
            <th style={{ textAlign: 'right', padding: '2mm 2mm', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', width: '22mm' }}>P. Unit.</th>
            <th style={{ textAlign: 'right', padding: '2mm 2mm', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', width: '24mm' }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((l, i) => {
            const cant = Number(l.cantidad);
            return (
              <tr key={l.id} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '2.5mm 2mm', fontWeight: '500' }}>{l.descripcion}</td>
                <td style={{ textAlign: 'right', padding: '2.5mm 2mm', fontFamily: 'monospace' }}>
                  {cant % 1 === 0 ? cant : cant.toFixed(3)}
                </td>
                <td style={{ textAlign: 'right', padding: '2.5mm 2mm', fontFamily: 'monospace' }}>
                  {formatARS(Number(l.precioUnitario))}
                </td>
                <td style={{ textAlign: 'right', padding: '2.5mm 2mm', fontFamily: 'monospace', fontWeight: '600' }}>
                  {formatARS(Number(l.subtotal))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totales */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6mm' }}>
        <div style={{ width: '60mm' }}>
          {Number(descuento) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1mm 0', fontSize: '11px', color: '#555' }}>
              <span>Subtotal</span>
              <span style={{ fontFamily: 'monospace' }}>{formatARS(Number(subtotalVenta))}</span>
            </div>
          )}
          {Number(descuento) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1mm 0', fontSize: '11px', color: '#555' }}>
              <span>Descuento</span>
              <span style={{ fontFamily: 'monospace' }}>− {formatARS(Number(descuento))}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2mm 0', borderTop: '2px solid #111', marginTop: '1mm', fontWeight: '800', fontSize: '14px' }}>
            <span>TOTAL</span>
            <span style={{ fontFamily: 'monospace' }}>{formatARS(Number(total))}</span>
          </div>
          {tipoPago === 'cuenta_corriente' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1mm 0', fontSize: '11px', color: '#555' }}>
              <span>A cuenta</span>
              <span style={{ fontFamily: 'monospace' }}>{formatARS(Number(montoPagado ?? 0))}</span>
            </div>
          )}
          {tipoPago === 'cuenta_corriente' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1mm 0', fontSize: '11px', color: '#555', fontWeight: '600' }}>
              <span>Saldo pendiente</span>
              <span style={{ fontFamily: 'monospace' }}>
                {formatARS(Number(total) - Number(montoPagado ?? 0))}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Forma de pago */}
      <div style={{ marginBottom: '6mm', padding: '2mm 4mm', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
        <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#888' }}>Forma de pago: </span>
        <span style={{ fontSize: '12px', fontWeight: '600' }}>
          {tipoPago === 'cuenta_corriente' ? 'Cuenta corriente' : (metodoPago ? (METODO_LABEL[metodoPago] ?? metodoPago) : '—')}
        </span>
      </div>

      {/* Notas */}
      {notas && (
        <div style={{ marginBottom: '6mm', padding: '2mm 4mm', border: '1px solid #e5e7eb', borderRadius: '4px', background: '#fffbeb' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#888', marginBottom: '1mm' }}>
            Notas
          </div>
          <div style={{ fontSize: '11px' }}>{notas}</div>
        </div>
      )}

      {/* Firma */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16mm', borderTop: '1px solid #e5e7eb', paddingTop: '4mm' }}>
        <div style={{ textAlign: 'center', width: '60mm' }}>
          <div style={{ borderTop: '1px solid #111', paddingTop: '2mm', fontSize: '10px', color: '#555' }}>
            Firma y aclaración
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '10px', color: '#aaa' }}>
          Gesto
        </div>
        <div style={{ textAlign: 'center', width: '60mm' }}>
          <div style={{ borderTop: '1px solid #111', paddingTop: '2mm', fontSize: '10px', color: '#555' }}>
            Aclaración del receptor
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────── */

function Separador({ char = '━' }: { char?: string }) {
  return (
    <div style={{ overflow: 'hidden', marginBottom: '3mm', color: '#888', fontSize: '10px', whiteSpace: 'nowrap' }}>
      {char.repeat(42)}
    </div>
  );
}

function FilaTotal({ label, valor, grande }: { label: string; valor: string; grande?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '1mm',
      fontWeight: grande ? 'bold' : 'normal',
      fontSize: grande ? '13px' : '11px',
    }}>
      <span>{label}</span>
      <span>{valor}</span>
    </div>
  );
}

/* ── Botón de impresión ──────────────────────── */
export function PrintButton({ canal }: { canal: 'minorista' | 'mayorista' }) {
  return (
    <button
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 px-3.5 h-9 rounded-lg border border-border bg-card text-[13px] font-medium hover:border-border/80 hover:bg-card/60 transition-all text-muted-foreground hover:text-foreground"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9"/>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
        <rect width="12" height="8" x="6" y="14"/>
      </svg>
      {canal === 'minorista' ? 'Imprimir ticket' : 'Imprimir remito'}
    </button>
  );
}
