/**
 * Plantillas PDF con @react-pdf/renderer (A4 vertical).
 * Solo se importan desde componentes client con dynamic({ ssr: false }).
 * Diseño premium: banda de acento, header jerárquico, total destacado.
 */
import {
  Document, Page, Text, View, StyleSheet,
} from '@react-pdf/renderer';

// Paleta — neutros cálidos + acento naranja brasa
const C = {
  tinta:    '#17120E', // negro cálido
  gris:     '#6b6560',
  grisSuave:'#9a948e',
  linea:    '#e7e3df',
  fondo:    '#faf8f6',
  acento:   '#E2541A', // naranja brasa
  acentoBg: '#FBEEE6', // tinte claro del acento
  blanco:   '#ffffff',
};

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.tinta,
    paddingTop: 0,
    paddingBottom: 56,
    paddingHorizontal: 0,
    backgroundColor: C.blanco,
  },

  // Banda de acento superior (full-bleed)
  topbar: { height: 6, backgroundColor: C.acento, width: '100%' },
  body: { paddingHorizontal: 44, paddingTop: 30 },

  // ── Header ──────────────────────────────────────────────────
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 26 },
  headerLeft: { flex: 1, paddingRight: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  brandMark: {
    width: 22, height: 22, borderRadius: 6, backgroundColor: C.acento,
    color: C.blanco, fontSize: 13, fontFamily: 'Helvetica-Bold',
    textAlign: 'center', paddingTop: 4, marginRight: 8,
  },
  brandName: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: C.tinta },
  brandSub:  { fontSize: 8, color: C.gris, marginTop: 1 },

  headerRight: { alignItems: 'flex-end' },
  docTitle:  { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.acento, letterSpacing: 1.5 },
  docNum:    { fontSize: 18, fontFamily: 'Helvetica-Bold', color: C.tinta, marginTop: 2 },

  // ── Meta ────────────────────────────────────────────────────
  metaRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  metaCard: {
    flex: 1, backgroundColor: C.fondo, borderRadius: 5, padding: 10,
    borderWidth: 1, borderColor: C.linea,
  },
  metaLabel: { fontSize: 6.5, color: C.grisSuave, textTransform: 'uppercase', marginBottom: 3, letterSpacing: 0.6, fontFamily: 'Helvetica-Bold' },
  metaValue: { fontSize: 9.5, fontFamily: 'Helvetica-Bold' },

  // ── Tabla ───────────────────────────────────────────────────
  tableHeader: {
    flexDirection: 'row', backgroundColor: C.tinta,
    paddingVertical: 7, paddingHorizontal: 10, borderRadius: 4, marginBottom: 2,
  },
  tableHeaderText: { fontSize: 6.5, color: C.blanco, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.linea },
  tableRowAlt: { backgroundColor: C.fondo },

  colDesc:  { flex: 4 },
  colCant:  { flex: 1, textAlign: 'right' },
  colPrice: { flex: 1.5, textAlign: 'right' },
  colSub:   { flex: 1.5, textAlign: 'right' },

  cellText: { fontSize: 9 },
  cellNum:  { fontSize: 9 },

  // ── Totales ─────────────────────────────────────────────────
  totalesWrap: { alignItems: 'flex-end', marginTop: 18 },
  totalesBox: { width: 230 },
  totalesRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalesLabel: { fontSize: 9, color: C.gris },
  totalesValue: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  totalFinalBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: C.acento, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12, marginTop: 6,
  },
  totalFinalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.blanco, letterSpacing: 0.5 },
  totalFinalValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.blanco },

  // ── Notas / condiciones ─────────────────────────────────────
  notasBox: { marginTop: 22, padding: 11, backgroundColor: C.fondo, borderRadius: 5, borderLeftWidth: 3, borderLeftColor: C.acento },
  notasLabel: { fontSize: 6.5, color: C.gris, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.6, fontFamily: 'Helvetica-Bold' },
  notasText:  { fontSize: 9, color: C.gris, lineHeight: 1.5 },

  // ── Footer ──────────────────────────────────────────────────
  footer: {
    position: 'absolute', bottom: 28, left: 44, right: 44,
    borderTopWidth: 1, borderTopColor: C.linea, paddingTop: 8,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: C.grisSuave },

  // ── Badge estado ────────────────────────────────────────────
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, marginTop: 6, alignSelf: 'flex-end' },
  badgeText: { fontSize: 7, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
});

function ars(n: number | string) {
  const v = Number(n);
  return `$ ${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtFecha(d: Date | string) {
  return new Date(d).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

type Linea = {
  descripcion: string;
  cantidad: string | number;
  precioUnitario: string | number;
  subtotal: string | number;
  esServicio?: boolean;
};

type PdfBaseProps = {
  numero: number;
  fecha: Date | string;
  clienteNombre: string;
  lineas: Linea[];
  subtotal: string | number;
  descuento: string | number;
  total: string | number;
  notas?: string | null;
  negocioNombre: string;
  negocioCuit?: string | null;
};

function Brand({ negocioNombre, negocioCuit }: { negocioNombre: string; negocioCuit?: string | null }) {
  return (
    <View style={styles.headerLeft}>
      <View style={styles.brandRow}>
        <Text style={styles.brandMark}>{(negocioNombre.trim()[0] ?? 'G').toUpperCase()}</Text>
        <Text style={styles.brandName}>{negocioNombre}</Text>
      </View>
      {negocioCuit ? <Text style={styles.brandSub}>CUIT {negocioCuit}</Text> : null}
    </View>
  );
}

function Tabla({ lineas, servicioHl = false }: { lineas: Linea[]; servicioHl?: boolean }) {
  return (
    <>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, styles.colDesc]}>Descripción</Text>
        <Text style={[styles.tableHeaderText, styles.colCant]}>Cant.</Text>
        <Text style={[styles.tableHeaderText, styles.colPrice]}>P. unit.</Text>
        <Text style={[styles.tableHeaderText, styles.colSub]}>Subtotal</Text>
      </View>
      {lineas.map((l, i) => (
        <View
          key={i}
          style={[
            styles.tableRow,
            i % 2 === 1 && !(servicioHl && l.esServicio) ? styles.tableRowAlt : {},
            servicioHl && l.esServicio ? { backgroundColor: C.acentoBg, borderLeftWidth: 2, borderLeftColor: C.acento } : {},
          ]}
        >
          <View style={[styles.colDesc, { flexDirection: 'column' }]}>
            {servicioHl && l.esServicio && (
              <Text style={{ fontSize: 6, color: C.acento, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>
                Servicio
              </Text>
            )}
            <Text style={styles.cellText}>{l.descripcion}</Text>
          </View>
          <Text style={[styles.cellNum, styles.colCant]}>{Number(l.cantidad)}</Text>
          <Text style={[styles.cellNum, styles.colPrice]}>{ars(l.precioUnitario)}</Text>
          <Text style={[styles.cellNum, styles.colSub]}>{ars(l.subtotal)}</Text>
        </View>
      ))}
    </>
  );
}

function Totales({ subtotal, descuento, total }: { subtotal: string | number; descuento: string | number; total: string | number }) {
  return (
    <View style={styles.totalesWrap}>
      <View style={styles.totalesBox}>
        <View style={styles.totalesRow}>
          <Text style={styles.totalesLabel}>Subtotal</Text>
          <Text style={styles.totalesValue}>{ars(subtotal)}</Text>
        </View>
        {Number(descuento) > 0 && (
          <View style={styles.totalesRow}>
            <Text style={styles.totalesLabel}>Descuento</Text>
            <Text style={styles.totalesValue}>− {ars(descuento)}</Text>
          </View>
        )}
        <View style={styles.totalFinalBar}>
          <Text style={styles.totalFinalLabel}>TOTAL</Text>
          <Text style={styles.totalFinalValue}>{ars(total)}</Text>
        </View>
      </View>
    </View>
  );
}

function Footer({ negocioNombre, negocioCuit }: { negocioNombre: string; negocioCuit?: string | null }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{negocioNombre}{negocioCuit ? ` · CUIT ${negocioCuit}` : ''}</Text>
      <Text style={styles.footerText}>Generado el {fmtFecha(new Date())} · Gesto</Text>
    </View>
  );
}

// ── REMITO PDF ─────────────────────────────────────────────────────────────────

export function RemitoPDF({
  numero, fecha, clienteNombre, lineas,
  subtotal, descuento, total, notas,
  negocioNombre, negocioCuit, metodoPago,
}: PdfBaseProps & { metodoPago?: string | null }) {
  return (
    <Document title={`Remito #${numero} — ${negocioNombre}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.topbar} />
        <View style={styles.body}>
          <View style={styles.header}>
            <Brand negocioNombre={negocioNombre} negocioCuit={negocioCuit} />
            <View style={styles.headerRight}>
              <Text style={styles.docTitle}>REMITO</Text>
              <Text style={styles.docNum}>N.° {String(numero).padStart(5, '0')}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Cliente</Text>
              <Text style={styles.metaValue}>{clienteNombre}</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Fecha</Text>
              <Text style={styles.metaValue}>{fmtFecha(fecha)}</Text>
            </View>
            {metodoPago && (
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Forma de pago</Text>
                <Text style={styles.metaValue}>{metodoPago}</Text>
              </View>
            )}
          </View>

          <Tabla lineas={lineas} />
          <Totales subtotal={subtotal} descuento={descuento} total={total} />

          {notas && (
            <View style={styles.notasBox}>
              <Text style={styles.notasLabel}>Observaciones</Text>
              <Text style={styles.notasText}>{notas}</Text>
            </View>
          )}
        </View>
        <Footer negocioNombre={negocioNombre} negocioCuit={negocioCuit} />
      </Page>
    </Document>
  );
}

// ── PRESUPUESTO PDF ────────────────────────────────────────────────────────────

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador', enviado: 'Enviado', aprobado: 'Aprobado',
  rechazado: 'Rechazado', vencido: 'Vencido', cobrado: 'Cobrado',
};
const ESTADO_COLOR: Record<string, string> = {
  borrador: '#6b7280', enviado: '#2563eb', aprobado: '#16a34a',
  rechazado: '#dc2626', vencido: '#d97706', cobrado: '#16a34a',
};

const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta_debito: 'Tarjeta de débito',
  tarjeta_credito: 'Tarjeta de crédito', mercado_pago: 'Mercado Pago', cheque: 'Cheque', otro: 'Otro',
};

export function PresupuestoPDF({
  numero, fecha, clienteNombre, lineas,
  subtotal, descuento, total, notas,
  negocioNombre, negocioCuit,
  validezDias, estado, tipo = 'presupuesto', metodoPago,
}: PdfBaseProps & { validezDias: number; estado: string; tipo?: 'presupuesto' | 'boleta'; metodoPago?: string | null }) {
  const esBoleta = tipo === 'boleta';
  const vencimiento = new Date(new Date(fecha).getTime() + validezDias * 86_400_000);
  const estadoColor = esBoleta ? '#16a34a' : (ESTADO_COLOR[estado] ?? C.gris);

  return (
    <Document title={`${esBoleta ? 'Recibo' : 'Presupuesto'} #${numero} — ${negocioNombre}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.topbar} />
        <View style={styles.body}>
          <View style={styles.header}>
            <Brand negocioNombre={negocioNombre} negocioCuit={negocioCuit} />
            <View style={styles.headerRight}>
              <Text style={styles.docTitle}>{esBoleta ? 'RECIBO' : 'PRESUPUESTO'}</Text>
              <Text style={styles.docNum}>N.° {String(numero).padStart(5, '0')}</Text>
              <View style={[styles.badge, { backgroundColor: estadoColor + '22' }]}>
                <Text style={[styles.badgeText, { color: estadoColor }]}>{esBoleta ? 'Pagado' : (ESTADO_LABEL[estado] ?? estado)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Cliente</Text>
              <Text style={styles.metaValue}>{clienteNombre}</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Fecha</Text>
              <Text style={styles.metaValue}>{fmtFecha(fecha)}</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>{esBoleta ? 'Forma de pago' : 'Válido hasta'}</Text>
              <Text style={styles.metaValue}>{esBoleta ? (METODO_LABEL[metodoPago ?? ''] ?? '—') : fmtFecha(vencimiento)}</Text>
            </View>
          </View>

          <Tabla lineas={lineas} servicioHl />
          <Totales subtotal={subtotal} descuento={descuento} total={total} />

          {notas ? (
            <View style={styles.notasBox}>
              <Text style={styles.notasLabel}>Observaciones</Text>
              <Text style={styles.notasText}>{notas}</Text>
            </View>
          ) : null}

          <View style={[styles.notasBox, { marginTop: notas ? 8 : 18 }]}>
            <Text style={styles.notasLabel}>{esBoleta ? 'Comprobante' : 'Condiciones'}</Text>
            <Text style={styles.notasText}>
              {esBoleta
                ? `Comprobante de pago emitido el ${fmtFecha(fecha)}. No válido como factura. Precios en pesos argentinos.`
                : `Presupuesto válido por ${validezDias} días desde su emisión (${fmtFecha(fecha)}). Precios en pesos argentinos, IVA incluido si corresponde.`}
            </Text>
          </View>
        </View>
        <Footer negocioNombre={negocioNombre} negocioCuit={negocioCuit} />
      </Page>
    </Document>
  );
}
