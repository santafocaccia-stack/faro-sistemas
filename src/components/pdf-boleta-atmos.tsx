/**
 * Boleta / recibo para el plan ATMOSFÉRICOS — A4 vertical, sobrio y simple.
 * Solo se importa desde la ruta API (server) con renderToBuffer.
 *
 * Pensada para un servicio a domicilio: dirección del servicio, fecha,
 * litros (opcional) y el monto cobrado destacado. Acento azul (agua).
 */
import {
  Document, Page, Text, View, StyleSheet,
} from '@react-pdf/renderer';

const C = {
  tinta:     '#0f172a',
  gris:      '#64748b',
  grisSuave: '#94a3b8',
  linea:     '#e2e8f0',
  fondo:     '#f8fafc',
  acento:    '#1d4ed8', // azul agua
  acentoBg:  '#eff6ff',
  blanco:    '#ffffff',
};

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.tinta,
    paddingTop: 0,
    paddingBottom: 56,
    backgroundColor: C.blanco,
  },
  topbar: { height: 6, backgroundColor: C.acento, width: '100%' },
  body: { paddingHorizontal: 48, paddingTop: 34 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 },
  brandName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: C.tinta },
  brandSub:  { fontSize: 8.5, color: C.gris, marginTop: 2 },
  docTitle:  { fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.acento, letterSpacing: 2 },
  docNum:    { fontSize: 11, color: C.gris, marginTop: 3 },

  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 26 },
  metaCard: {
    flex: 1, backgroundColor: C.fondo, borderRadius: 6, padding: 12,
    borderWidth: 1, borderColor: C.linea,
  },
  metaLabel: { fontSize: 7, color: C.grisSuave, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.8, fontFamily: 'Helvetica-Bold' },
  metaValue: { fontSize: 10.5, fontFamily: 'Helvetica-Bold' },

  detalleBox: {
    borderWidth: 1, borderColor: C.linea, borderRadius: 6,
    paddingVertical: 16, paddingHorizontal: 16, marginBottom: 20,
  },
  detalleTitulo: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  detalleSub: { fontSize: 9.5, color: C.gris },

  totalBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: C.acento, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 18, marginBottom: 22,
  },
  totalLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.blanco, letterSpacing: 0.5 },
  totalValue: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: C.blanco },

  pagoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.linea },
  pagoLabel: { fontSize: 9.5, color: C.gris },
  pagoValue: { fontSize: 9.5, fontFamily: 'Helvetica-Bold' },

  notaBox: { marginTop: 24, padding: 12, backgroundColor: C.acentoBg, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: C.acento },
  notaText: { fontSize: 8.5, color: C.gris, lineHeight: 1.5 },

  footer: {
    position: 'absolute', bottom: 28, left: 48, right: 48,
    borderTopWidth: 1, borderTopColor: C.linea, paddingTop: 8,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  footerText: { fontSize: 7.5, color: C.grisSuave },
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

export type BoletaAtmosProps = {
  numero: string;
  fecha: Date | string;
  direccion: string;
  clienteNombre?: string | null;
  litros?: string | null;
  monto: string | number;
  metodoPago?: string | null;
  negocioNombre: string;
  negocioCuit?: string | null;
  negocioTelefono?: string | null;
};

export function BoletaAtmosPDF({
  numero, fecha, direccion, clienteNombre, litros, monto, metodoPago,
  negocioNombre, negocioCuit, negocioTelefono,
}: BoletaAtmosProps) {
  return (
    <Document title={`Recibo ${numero} — ${negocioNombre}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.topbar} />
        <View style={styles.body}>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.brandName}>{negocioNombre}</Text>
              {negocioCuit ? <Text style={styles.brandSub}>CUIT {negocioCuit}</Text> : null}
              {negocioTelefono ? <Text style={styles.brandSub}>Tel: {negocioTelefono}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.docTitle}>RECIBO</Text>
              <Text style={styles.docNum}>N.° {numero}</Text>
            </View>
          </View>

          {/* Meta: cliente + fecha */}
          <View style={styles.metaRow}>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Cliente</Text>
              <Text style={styles.metaValue}>{clienteNombre || 'Consumidor final'}</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Fecha</Text>
              <Text style={styles.metaValue}>{fmtFecha(fecha)}</Text>
            </View>
          </View>

          {/* Detalle del servicio */}
          <View style={styles.detalleBox}>
            <Text style={styles.detalleTitulo}>Servicio de desagote</Text>
            <Text style={styles.detalleSub}>Domicilio: {direccion}</Text>
            {litros ? <Text style={styles.detalleSub}>Litros extraídos: {litros} L</Text> : null}
          </View>

          {/* Total destacado */}
          <View style={styles.totalBar}>
            <Text style={styles.totalLabel}>TOTAL COBRADO</Text>
            <Text style={styles.totalValue}>{ars(monto)}</Text>
          </View>

          {/* Forma de pago */}
          {metodoPago ? (
            <View style={styles.pagoRow}>
              <Text style={styles.pagoLabel}>Forma de pago</Text>
              <Text style={styles.pagoValue}>{metodoPago}</Text>
            </View>
          ) : null}

          {/* Nota */}
          <View style={styles.notaBox}>
            <Text style={styles.notaText}>
              Comprobante de pago emitido el {fmtFecha(fecha)}. No válido como factura.
              Importe en pesos argentinos.
            </Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{negocioNombre}{negocioCuit ? ` · CUIT ${negocioCuit}` : ''}</Text>
          <Text style={styles.footerText}>Generado el {fmtFecha(new Date())} · Gesto</Text>
        </View>
      </Page>
    </Document>
  );
}
