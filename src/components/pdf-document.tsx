/**
 * Plantillas PDF con @react-pdf/renderer.
 * Solo se importan desde componentes client con dynamic({ ssr: false }).
 */
import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer';

// Paleta neutral para PDF profesional
const C = {
  negro:    '#0d0d0d',
  gris:     '#6b7280',
  grisClar: '#e5e7eb',
  griFondo: '#f9fafb',
  primary:  '#c2440f',   // acento naranja Faro
  blanco:   '#ffffff',
};

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.negro,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    backgroundColor: C.blanco,
  },

  // ── Header ─────────────────────────────────────────────────────────────
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: 'flex-end' },
  brandName: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: C.negro, marginBottom: 2 },
  brandSub:  { fontSize: 8, color: C.gris },
  docTitle:  { fontSize: 22, fontFamily: 'Helvetica-Bold', color: C.primary, textAlign: 'right' },
  docNum:    { fontSize: 10, color: C.gris, textAlign: 'right', marginTop: 2 },

  // ── Meta row ───────────────────────────────────────────────────────────
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  metaCard: {
    flex: 1,
    backgroundColor: C.griFondo,
    borderRadius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: C.grisClar,
  },
  metaLabel: { fontSize: 7, color: C.gris, textTransform: 'uppercase', marginBottom: 3, letterSpacing: 0.5 },
  metaValue: { fontSize: 9, fontFamily: 'Helvetica-Bold' },

  // ── Divider ────────────────────────────────────────────────────────────
  divider: { height: 1, backgroundColor: C.grisClar, marginBottom: 16 },

  // ── Table ──────────────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.negro,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginBottom: 4,
  },
  tableHeaderText: { fontSize: 7, color: C.blanco, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.4 },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.grisClar,
  },
  tableRowAlt: {
    backgroundColor: C.griFondo,
  },

  colDesc:  { flex: 4 },
  colCant:  { flex: 1, textAlign: 'right' },
  colPrice: { flex: 1.5, textAlign: 'right' },
  colSub:   { flex: 1.5, textAlign: 'right' },

  cellText: { fontSize: 9 },
  cellNum:  { fontSize: 9, fontFamily: 'Helvetica' },

  // ── Totales ────────────────────────────────────────────────────────────
  totalesWrap: { alignItems: 'flex-end', marginTop: 16 },
  totalesBox: { width: 200 },
  totalesRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalesLabel: { fontSize: 9, color: C.gris },
  totalesValue: { fontSize: 9, fontFamily: 'Helvetica' },
  totalesDivider: { height: 1, backgroundColor: C.grisClar, marginVertical: 4 },
  totalFinalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalFinalLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  totalFinalValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.primary },

  // ── Notas ──────────────────────────────────────────────────────────────
  notasBox: {
    marginTop: 24,
    padding: 10,
    backgroundColor: C.griFondo,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.grisClar,
  },
  notasLabel: { fontSize: 7, color: C.gris, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  notasText:  { fontSize: 9, color: C.gris, lineHeight: 1.5 },

  // ── Footer ─────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: C.grisClar,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: C.gris },

  // ── Badge estado ───────────────────────────────────────────────────────
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 7, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function ars(n: number | string) {
  const v = Number(n);
  return `$ ${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtFecha(d: Date | string) {
  return new Date(d).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ── Tipos ──────────────────────────────────────────────────────────────────────

type Linea = {
  descripcion: string;
  cantidad: string | number;
  precioUnitario: string | number;
  subtotal: string | number;
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

// ── REMITO PDF ─────────────────────────────────────────────────────────────────

export function RemitoPDF({
  numero, fecha, clienteNombre, lineas,
  subtotal, descuento, total, notas,
  negocioNombre, negocioCuit, metodoPago,
}: PdfBaseProps & { metodoPago?: string | null }) {
  const now = new Date().toLocaleDateString('es-AR');

  return (
    <Document title={`Remito #${numero} — ${negocioNombre}`}>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brandName}>{negocioNombre}</Text>
            {negocioCuit && <Text style={styles.brandSub}>CUIT {negocioCuit}</Text>}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>REMITO</Text>
            <Text style={styles.docNum}>N.° {String(numero).padStart(5, '0')}</Text>
          </View>
        </View>

        {/* Meta */}
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

        <View style={styles.divider} />

        {/* Tabla */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colDesc]}>Descripción</Text>
          <Text style={[styles.tableHeaderText, styles.colCant]}>Cant.</Text>
          <Text style={[styles.tableHeaderText, styles.colPrice]}>P. unit.</Text>
          <Text style={[styles.tableHeaderText, styles.colSub]}>Subtotal</Text>
        </View>

        {lineas.map((l, i) => (
          <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
            <Text style={[styles.cellText, styles.colDesc]}>{l.descripcion}</Text>
            <Text style={[styles.cellNum, styles.colCant]}>{Number(l.cantidad)}</Text>
            <Text style={[styles.cellNum, styles.colPrice]}>{ars(l.precioUnitario)}</Text>
            <Text style={[styles.cellNum, styles.colSub]}>{ars(l.subtotal)}</Text>
          </View>
        ))}

        {/* Totales */}
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
            <View style={styles.totalesDivider} />
            <View style={styles.totalFinalRow}>
              <Text style={styles.totalFinalLabel}>TOTAL</Text>
              <Text style={styles.totalFinalValue}>{ars(total)}</Text>
            </View>
          </View>
        </View>

        {/* Notas */}
        {notas && (
          <View style={styles.notasBox}>
            <Text style={styles.notasLabel}>Observaciones</Text>
            <Text style={styles.notasText}>{notas}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{negocioNombre}{negocioCuit ? ` · CUIT ${negocioCuit}` : ''}</Text>
          <Text style={styles.footerText}>Generado el {now}</Text>
        </View>

      </Page>
    </Document>
  );
}

// ── PRESUPUESTO PDF ────────────────────────────────────────────────────────────

const ESTADO_LABEL: Record<string, string> = {
  borrador:  'Borrador',
  enviado:   'Enviado',
  aprobado:  'Aprobado',
  rechazado: 'Rechazado',
  vencido:   'Vencido',
};

const ESTADO_COLOR: Record<string, string> = {
  borrador:  '#6b7280',
  enviado:   '#2563eb',
  aprobado:  '#16a34a',
  rechazado: '#dc2626',
  vencido:   '#d97706',
};

export function PresupuestoPDF({
  numero, fecha, clienteNombre, lineas,
  subtotal, descuento, total, notas,
  negocioNombre, negocioCuit,
  validezDias, estado,
}: PdfBaseProps & { validezDias: number; estado: string }) {
  const now = new Date().toLocaleDateString('es-AR');
  const vencimiento = new Date(new Date(fecha).getTime() + validezDias * 86_400_000);
  const estadoColor = ESTADO_COLOR[estado] ?? C.gris;

  return (
    <Document title={`Presupuesto #${numero} — ${negocioNombre}`}>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brandName}>{negocioNombre}</Text>
            {negocioCuit && <Text style={styles.brandSub}>CUIT {negocioCuit}</Text>}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>PRESUPUESTO</Text>
            <Text style={styles.docNum}>N.° {String(numero).padStart(5, '0')}</Text>
            <View style={[styles.badge, { backgroundColor: estadoColor + '22' }]}>
              <Text style={[styles.badgeText, { color: estadoColor }]}>
                {ESTADO_LABEL[estado] ?? estado}
              </Text>
            </View>
          </View>
        </View>

        {/* Meta */}
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
            <Text style={styles.metaLabel}>Válido hasta</Text>
            <Text style={styles.metaValue}>{fmtFecha(vencimiento)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Tabla */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colDesc]}>Descripción</Text>
          <Text style={[styles.tableHeaderText, styles.colCant]}>Cant.</Text>
          <Text style={[styles.tableHeaderText, styles.colPrice]}>P. unit.</Text>
          <Text style={[styles.tableHeaderText, styles.colSub]}>Subtotal</Text>
        </View>

        {lineas.map((l, i) => (
          <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
            <Text style={[styles.cellText, styles.colDesc]}>{l.descripcion}</Text>
            <Text style={[styles.cellNum, styles.colCant]}>{Number(l.cantidad)}</Text>
            <Text style={[styles.cellNum, styles.colPrice]}>{ars(l.precioUnitario)}</Text>
            <Text style={[styles.cellNum, styles.colSub]}>{ars(l.subtotal)}</Text>
          </View>
        ))}

        {/* Totales */}
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
            <View style={styles.totalesDivider} />
            <View style={styles.totalFinalRow}>
              <Text style={styles.totalFinalLabel}>TOTAL</Text>
              <Text style={styles.totalFinalValue}>{ars(total)}</Text>
            </View>
          </View>
        </View>

        {/* Notas */}
        {notas ? (
          <View style={styles.notasBox}>
            <Text style={styles.notasLabel}>Observaciones</Text>
            <Text style={styles.notasText}>{notas}</Text>
          </View>
        ) : null}

        {/* Condición validez */}
        <View style={[styles.notasBox, { marginTop: notas ? 8 : 24 }]}>
          <Text style={styles.notasLabel}>Condiciones</Text>
          <Text style={styles.notasText}>
            Este presupuesto tiene validez de {validezDias} días a partir de su emisión ({fmtFecha(fecha)}).
            Los precios están expresados en pesos argentinos e incluyen IVA si corresponde.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{negocioNombre}{negocioCuit ? ` · CUIT ${negocioCuit}` : ''}</Text>
          <Text style={styles.footerText}>Generado el {now}</Text>
        </View>

      </Page>
    </Document>
  );
}
